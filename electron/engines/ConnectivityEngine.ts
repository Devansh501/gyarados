import { EventEmitter } from 'node:events';
import ModbusRTU from 'modbus-serial';
import { SerialPortOptions } from 'modbus-serial/ModbusRTU';
import { DeviceState } from './types';
import {
  getDefaultModbusPort,
  MODBUS_CONNECT_TIMEOUT_MS,
  MODBUS_TIMEOUT_MS,
  MAX_RS485_DEVICES,
  RS485_DISCOVERY_REGISTER,
  RS485_SCAN_ATTEMPTS_PER_UNIT,
} from '../../src/constants';
import { scanWifiDevices } from '../scanner';

export class ConnectivityEngine extends EventEmitter {
  private devices = new Map<string, DeviceState>();
  // Keep track of serial ports to share clients for RTU
  private serialClients = new Map<string, ModbusRTU>();
  private serialOptions = new Map<string, SerialPortOptions>();
  private serialLocks = new Map<string, boolean>();
  private serialLastAction = new Map<string, number>();

  constructor() {
    super();
  }

  public getDevices() {
    return this.devices;
  }

  public getDevice(id: string) {
    return this.devices.get(id);
  }

  public getSerialClient(path: string) {
    return this.serialClients.get(path);
  }

  public async scanWifi(port?: number, onDeviceFound?: (device: any) => void) {
    return scanWifiDevices(port, onDeviceFound);
  }

  public async connectTCP(ip: string, port = getDefaultModbusPort()): Promise<void> {
    if (this.devices.has(ip)) {
      const existing = this.devices.get(ip);
      if (existing?.status === 'CONNECTED' || existing?.status === 'CONNECTING') {
        return;
      }
    }

    const client = new ModbusRTU();
    const state: DeviceState = {
      id: ip,
      type: 'tcp',
      ip,
      status: 'CONNECTING',
      pumpType: 'base', // Default until discovered
      failCount: 0,
      client,
    };

    this.devices.set(ip, state);
    this.emit('status-changed', { ip, status: state.status });

    try {
      await client.connectTCP(ip, { port, timeout: MODBUS_CONNECT_TIMEOUT_MS });

      if (this.devices.get(ip) !== state) {
        this.closeClient(client);
        return;
      }

      client.setID(1);
      client.setTimeout(MODBUS_TIMEOUT_MS);

      // Read discovery register to determine pump type (as requested by user, default base)
      try {
        await client.readHoldingRegisters(RS485_DISCOVERY_REGISTER, 1);
        // In the future, we will map the result to pumpType. For now, default is 'base'.
      } catch (err) {
        console.warn(`[ConnectivityEngine] Could not read discovery register for ${ip}`, err);
        // We still consider it connected if the TCP connection succeeded
      }

      if (this.devices.get(ip) !== state) {
        this.closeClient(client);
        return;
      }

      state.status = 'CONNECTED';
      this.emit('status-changed', { ip, status: state.status });
      this.emit('device-connected', state);
    } catch (error) {
      if (this.devices.get(ip) !== state) {
        this.closeClient(client);
        return;
      }

      console.error(`[ConnectivityEngine] Failed to connect to ${ip}:`, error);
      this.disconnect(ip);
      throw error;
    }
  }

  public async scanAndConnectRTU(
    path: string,
    options: SerialPortOptions
  ): Promise<{ id: string; unitId: number }[]> {
    const existingClient = this.serialClients.get(path);
    const existingOptions = this.serialOptions.get(path);
    const settingsChanged =
      !existingOptions || JSON.stringify(existingOptions) !== JSON.stringify(options);

    let client: ModbusRTU;

    if (existingClient && !settingsChanged) {
      // Same port, same settings: this is a "rescan" - reuse the open client instead of
      // closing and immediately reopening it. Closing a serial port is async at the OS
      // level, so reopening it right away (as this used to do) raced the close and could
      // intermittently fail to reacquire the port.
      client = existingClient;
    } else {
      if (existingClient) {
        // Settings actually changed - existing connections on this path are no longer
        // valid, so tear them down and wait for the close to fully complete before
        // reopening the same OS path.
        for (const [id, device] of this.devices.entries()) {
          if (device.type === 'rtu' && device.path === path) {
            this.disconnect(id);
          }
        }
        await this.closeClientAsync(existingClient);
      }

      client = new ModbusRTU();
      try {
        await client.connectRTUBuffered(path, options);
      } catch (error) {
        console.error(`[ConnectivityEngine] Failed to open RTU port ${path}:`, error);
        throw error;
      }

      this.serialClients.set(path, client);
      this.serialOptions.set(path, options);
    }

    // Devices already known on this path are owned by VerbosePoller/AliveCheckPoller;
    // only sweep for unit IDs we haven't already found, so a rescan doesn't disrupt
    // dashboards already open against this bus.
    const alreadyKnown = new Set<number>();
    for (const device of this.devices.values()) {
      if (device.type === 'rtu' && device.path === path && device.unitId !== undefined) {
        alreadyKnown.add(device.unitId);
      }
    }

    const foundDevices: {
      id: string;
      unitId: number;
      state?: DeviceState;
      pumpStateVal?: number;
    }[] = [];

    for (let unitId = 1; unitId <= MAX_RS485_DEVICES; unitId++) {
      if (alreadyKnown.has(unitId)) continue;

      let response: { data: number[] } | undefined;
      for (let attempt = 0; attempt < RS485_SCAN_ATTEMPTS_PER_UNIT && !response; attempt++) {
        try {
          response = await this.runWithSerialLock(path, async (lockedClient) => {
            lockedClient.setID(unitId);
            lockedClient.setTimeout(MODBUS_TIMEOUT_MS);
            return await lockedClient.readHoldingRegisters(RS485_DISCOVERY_REGISTER, 1);
          });
        } catch (error) {
          // Timeout, CRC error, or bus collision - retry a couple of times before giving
          // up on this unit ID for this pass; RS-485 noise is routinely transient.
        }
      }

      if (!response) continue;

      const pumpStateVal = response.data[0];
      const id = `${path}:${unitId}`;
      const state: DeviceState = {
        id,
        type: 'rtu',
        path,
        unitId,
        status: 'CONNECTED',
        pumpType: 'base', // Default to base for now
        failCount: 0,
        client,
      };

      this.devices.set(id, state);
      foundDevices.push({ id, unitId, state, pumpStateVal });
    }

    // Emit connection events only AFTER the scan completes to prevent
    // AliveCheckPoller from interrupting the remaining scan loop
    for (const { id, state, pumpStateVal } of foundDevices) {
      this.emit('status-changed', { ip: id, status: 'CONNECTED' });
      this.emit('device-connected', state);
      this.emit('pump-test-state', { ip: id, state: pumpStateVal });
    }

    const anyDeviceOnPath = [...this.devices.values()].some(
      (d) => d.type === 'rtu' && d.path === path
    );
    if (!anyDeviceOnPath) {
      this.closeClient(client);
      this.serialClients.delete(path);
      this.serialOptions.delete(path);
    }

    return foundDevices.map((d) => ({ id: d.id, unitId: d.unitId }));
  }

  public async writeRegister(id: string, register: number, value: number) {
    const state = this.devices.get(id);
    if (!state || state.status !== 'CONNECTED') {
      throw new Error('Pump is not connected');
    }

    if (state.type === 'tcp') {
      await state.client!.writeRegisters(register, [value]);
    } else if (state.type === 'rtu' && state.path) {
      await this.runWithSerialLock(state.path, async (client) => {
        client.setID(state.unitId!);
        await client.writeRegisters(register, [value]);
      });
    }
  }

  public disconnect(id: string) {
    const state = this.devices.get(id);
    if (!state) return;

    if (state.type === 'tcp') {
      if (state.client) {
        this.closeClient(state.client);
      }
    }

    this.devices.delete(id);
    this.emit('status-changed', { ip: id, status: 'DISCONNECTED' });
    this.emit('device-disconnected', id);

    // If it was an RTU device, check if any other devices are on this serial port
    if (state.type === 'rtu' && state.path) {
      let stillInUse = false;
      for (const d of this.devices.values()) {
        if (d.type === 'rtu' && d.path === state.path) {
          stillInUse = true;
          break;
        }
      }
      if (!stillInUse) {
        const client = this.serialClients.get(state.path);
        if (client) {
          this.closeClient(client);
          this.serialClients.delete(state.path);
        }
      }
    }
  }

  public async runWithSerialLock<T>(
    path: string,
    fn: (client: ModbusRTU) => Promise<T>
  ): Promise<T> {
    const client = this.serialClients.get(path);
    if (!client) throw new Error('Serial port not open');

    while (this.serialLocks.get(path)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.serialLocks.set(path, true);
    try {
      const now = Date.now();
      const lastAction = this.serialLastAction.get(path) || 0;
      const timeSinceLast = now - lastAction;
      if (timeSinceLast < 50) {
        await new Promise((resolve) => setTimeout(resolve, 50 - timeSinceLast));
      }

      return await fn(client);
    } finally {
      this.serialLastAction.set(path, Date.now());
      this.serialLocks.set(path, false);
    }
  }

  private closeClient(client: ModbusRTU) {
    try {
      client.close(() => {});
    } catch {
      // Ignore close errors
    }
  }

  private closeClientAsync(client: ModbusRTU): Promise<void> {
    return new Promise((resolve) => {
      try {
        client.close(() => resolve());
      } catch {
        resolve();
      }
    });
  }
}

export const connectivityEngine = new ConnectivityEngine();
