import ModbusRTU from 'modbus-serial';
import { EventEmitter } from 'node:events';
import { MODBUS_REGISTERS } from './constants/registers';
import {
  getDefaultModbusPort,
  HEARTBEAT_INTERVAL_MS,
  MAX_POLL_FAILURES,
  MODBUS_TIMEOUT_MS,
} from './constants/network';

export type PumpStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export interface PumpState {
  ip: string;
  status: PumpStatus;
  failCount: number;
  client: ModbusRTU | null;
  pollInterval: NodeJS.Timeout | null;
  isPolling: boolean;
}

class PumpManager extends EventEmitter {
  private pumps: Map<string, PumpState> = new Map();

  constructor() {
    super();
  }

  public async connectPump(ip: string, port: number = getDefaultModbusPort()) {
    if (this.pumps.has(ip)) {
      const existing = this.pumps.get(ip);
      if (existing?.status === 'CONNECTED' || existing?.status === 'CONNECTING') {
        return;
      }
    }

    const client = new ModbusRTU();
    client.setTimeout(MODBUS_TIMEOUT_MS);

    const state: PumpState = {
      ip,
      status: 'CONNECTING',
      failCount: 0,
      client,
      pollInterval: null,
      isPolling: false
    };

    this.pumps.set(ip, state);
    this.emit('status-changed', { ip, status: state.status });

    try {
      // Connect to the pump
      await client.connectTCP(ip, { port });
      client.setID(1); // Default unit ID

      state.status = 'CONNECTED';
      this.emit('status-changed', { ip, status: state.status });

      state.pollInterval = setInterval(() => this.pollPump(ip), HEARTBEAT_INTERVAL_MS);
    } catch (error) {
      console.error(`[PumpManager] Failed to connect to ${ip}:`, error);
      this.handleDisconnect(ip);
      throw error;
    }
  }

  public disconnectPump(ip: string) {
    this.handleDisconnect(ip);
  }

  private async pollPump(ip: string) {
    const state = this.pumps.get(ip);
    if (!state || !state.client || state.status !== 'CONNECTED' || state.isPolling) return;

    state.isPolling = true;

    try {
      await state.client.readHoldingRegisters(MODBUS_REGISTERS.DEVICE_ID, 1);

      if (!this.pumps.has(ip) || state.status !== 'CONNECTED') return;

      state.failCount = 0;
    } catch (error) {
      // We might have been disconnected while waiting for the response
      if (!this.pumps.has(ip) || state.status !== 'CONNECTED') return;

      // Polling failed (timeout, network error, etc)
      state.failCount += 1;
      console.warn(`[PumpManager] Poll failed for ${ip}. Fail count: ${state.failCount}`);

      if (state.failCount >= MAX_POLL_FAILURES) {
        console.error(`[PumpManager] Max fail count reached for ${ip}. Disconnecting.`);
        this.handleDisconnect(ip);
      }
    } finally {
      state.isPolling = false;
    }
  }

  private handleDisconnect(ip: string) {
    const state = this.pumps.get(ip);
    if (!state) return;

    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
    }

    if (state.client) {
      try {
        state.client.close(() => {});
      } catch (e) {
        // Ignore close errors
      }
      state.client = null;
    }
    
    // Remove from map to clean up memory
    this.pumps.delete(ip);

    this.emit('status-changed', { ip, status: 'DISCONNECTED' });
  }
}

export const pumpManager = new PumpManager();
