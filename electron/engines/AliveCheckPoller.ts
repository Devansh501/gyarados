import { EventEmitter } from 'node:events';
import { connectivityEngine } from './ConnectivityEngine';
import { verbosePoller } from './VerbosePoller';
import { DeviceState } from './types';
import {
  HEARTBEAT_INTERVAL_MS,
  MAX_POLL_FAILURES,
  RS485_DISCOVERY_REGISTER,
  RS485_CHECK_ALIVE_INTERVAL,
} from '../../src/constants';

export class AliveCheckPoller extends EventEmitter {
  private intervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    // Listen to connections to start alive checks
    connectivityEngine.on('device-connected', (device: DeviceState) => {
      this.startPolling(device);
    });

    connectivityEngine.on('device-disconnected', (id: string) => {
      this.stopPolling(id);
    });
  }

  private startPolling(device: DeviceState) {
    if (device.type === 'tcp') {
      const interval = setInterval(() => this.pollTCPDevice(device.id), HEARTBEAT_INTERVAL_MS);
      this.intervals.set(device.id, interval);
    } else if (device.type === 'rtu' && device.path) {
      // For RTU, we poll per serial port
      if (!this.intervals.has(device.path)) {
        const interval = setInterval(() => this.pollSerialPort(device.path!), RS485_CHECK_ALIVE_INTERVAL);
        this.intervals.set(device.path, interval);
      }
    }
  }

  private stopPolling(id: string) {
    if (this.intervals.has(id)) {
      clearInterval(this.intervals.get(id)!);
      this.intervals.delete(id);
    }

    // For RTU, we need to check if there are any devices left on the port
    const devices = connectivityEngine.getDevices();
    const remainingSerialPaths = new Set<string>();
    for (const d of devices.values()) {
      if (d.type === 'rtu' && d.path) {
        remainingSerialPaths.add(d.path);
      }
    }

    for (const [path, interval] of this.intervals.entries()) {
      // if this path is a serial port and no longer used
      if (path.includes('/') || path.includes('COM')) { // basic heuristic
        if (!remainingSerialPaths.has(path)) {
          clearInterval(interval);
          this.intervals.delete(path);
        }
      }
    }
  }

  private async pollTCPDevice(id: string) {
    const device = connectivityEngine.getDevice(id);
    if (!device || device.status !== 'CONNECTED') return;
    if (verbosePoller.isPolling(id)) return;

    try {
      // Use RS485_DISCOVERY_REGISTER as the common alive/run-state register as per user requirements
      const res = await device.client.readHoldingRegisters(RS485_DISCOVERY_REGISTER, 1);
      device.failCount = 0;
      this.emit('pump-test-state', { ip: id, state: res.data[0] });
    } catch (error) {
      device.failCount += 1;
      this.emit('pump-fail-count', { ip: id, failCount: device.failCount });

      if (device.failCount >= MAX_POLL_FAILURES) {
        console.error(`[AliveCheckPoller] Max fail count reached for ${id}. Disconnecting.`);
        connectivityEngine.disconnect(id);
      }
    }
  }

  private activePolls = new Map<string, boolean>();

  private async pollSerialPort(path: string) {
    if (this.activePolls.get(path)) return;
    this.activePolls.set(path, true);

    try {
      const allDevices = connectivityEngine.getDevices();
      const devicesOnPort = Array.from(allDevices.values()).filter(
        (p) => p.type === 'rtu' && p.path === path && p.status === 'CONNECTED'
      );

      if (devicesOnPort.length === 0) return;

      for (const device of devicesOnPort) {
        if (device.status !== 'CONNECTED') continue;
        if (verbosePoller.isPolling(device.id)) continue;

        try {
          await connectivityEngine.runWithSerialLock(path, async (client) => {
            client.setID(device.unitId!);
            const res = await client.readHoldingRegisters(RS485_DISCOVERY_REGISTER, 1);
            device.failCount = 0;
            this.emit('pump-test-state', { ip: device.id, state: res.data[0] });
          });
        } catch (error) {
          device.failCount += 1;
          this.emit('pump-fail-count', { ip: device.id, failCount: device.failCount });

          if (device.failCount >= MAX_POLL_FAILURES) {
            console.error(`[AliveCheckPoller] Max fail count reached for ${device.id}. Disconnecting.`);
            connectivityEngine.disconnect(device.id);
          }
        }
      }
    } catch (e) {
      console.error(`[AliveCheckPoller] pollSerialPort error for ${path}:`, e);
    } finally {
      this.activePolls.set(path, false);
    }
  }
}

export const aliveCheckPoller = new AliveCheckPoller();
