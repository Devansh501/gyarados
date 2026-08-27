import { EventEmitter } from 'node:events';
import ModbusRTU from 'modbus-serial';
import { connectivityEngine } from './ConnectivityEngine';
import { PUMP_POLL_CONFIG } from '../../src/registers';
import { HEARTBEAT_INTERVAL_MS, MAX_POLL_FAILURES } from '../../src/constants';

export class VerbosePoller extends EventEmitter {
  private intervals = new Map<string, NodeJS.Timeout>();
  private activePolls = new Map<string, boolean>();

  constructor() {
    super();

    // Auto-stop verbose polling if device disconnects
    connectivityEngine.on('device-disconnected', (id: string) => {
      this.stop(id);
    });
  }

  public start(id: string) {
    if (this.intervals.has(id)) return;

    const device = connectivityEngine.getDevice(id);
    if (!device || device.status !== 'CONNECTED') {
      throw new Error(`Device ${id} is not connected or does not exist`);
    }

    const interval = setInterval(() => this.pollDevice(id), HEARTBEAT_INTERVAL_MS);
    this.intervals.set(id, interval);
  }

  public stop(id: string) {
    if (this.intervals.has(id)) {
      clearInterval(this.intervals.get(id)!);
      this.intervals.delete(id);
    }
  }

  public isPolling(id: string) {
    return this.intervals.has(id);
  }

  private async pollDevice(id: string) {
    if (this.activePolls.get(id)) return;
    this.activePolls.set(id, true);

    try {
      const device = connectivityEngine.getDevice(id);
      if (!device || device.status !== 'CONNECTED') {
        this.stop(id);
        return;
      }

      const config = PUMP_POLL_CONFIG[device.pumpType];

      if (device.type === 'tcp') {
        try {
          const results = await this.pollRegisters(device.client, config, false);
          device.failCount = 0;
          this.emit('pump-state-update', { ip: id, registers: results });
        } catch (error) {
          this.handlePollError(id);
        }
      } else if (device.type === 'rtu' && device.path) {
        try {
          await connectivityEngine.runWithSerialLock(device.path, async (client) => {
            client.setID(device.unitId!);
            const results = await this.pollRegisters(client, config, true);
            device.failCount = 0;
            this.emit('pump-state-update', { ip: id, registers: results });
          });
        } catch (error) {
          this.handlePollError(id);
        }
      }
    } finally {
      this.activePolls.set(id, false);
    }
  }

  private handlePollError(id: string) {
    const device = connectivityEngine.getDevice(id);
    if (!device) return;

    device.failCount += 1;
    this.emit('pump-fail-count', { ip: id, failCount: device.failCount });

    if (device.failCount >= MAX_POLL_FAILURES) {
      console.error(`[VerbosePoller] Max fail count reached for ${id}. Disconnecting.`);
      this.stop(id);
      connectivityEngine.disconnect(id);
    }
  }

  private async pollRegisters(client: ModbusRTU, config: any, isRTU: boolean): Promise<Record<number, number>> {
    const results: Record<number, number> = {};
    const delay = () => new Promise(res => setTimeout(res, 50));
    let isFirst = true;

    if (config.holding) {
      const blocks = Array.isArray(config.holding) ? config.holding : [config.holding];
      for (const block of blocks) {
        if (!isFirst && isRTU) await delay();
        isFirst = false;
        
        const res = await client.readHoldingRegisters(block.start, block.length);
        for (let i = 0; i < block.length; i++) {
          results[block.start + i] = res.data[i];
        }
      }
    }
    if (config.input) {
      const blocks = Array.isArray(config.input) ? config.input : [config.input];
      for (const block of blocks) {
        if (!isFirst && isRTU) await delay();
        isFirst = false;

        const res = await client.readInputRegisters(block.start, block.length);
        for (let i = 0; i < block.length; i++) {
          results[block.start + i] = res.data[i];
        }
      }
    }
    return results;
  }
}

export const verbosePoller = new VerbosePoller();
