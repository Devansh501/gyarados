import ModbusRTU from 'modbus-serial';
import { EventEmitter } from 'node:events';
import { MODBUS_REGISTERS } from '../src/registers';
import {
  getDefaultModbusPort,
  HEARTBEAT_INTERVAL_MS,
  MAX_POLL_FAILURES,
  MODBUS_CONNECT_TIMEOUT_MS,
  MODBUS_TIMEOUT_MS,
} from '../src/constants';

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

    const state: PumpState = {
      ip,
      status: 'CONNECTING',
      failCount: 0,
      client,
      pollInterval: null,
      isPolling: false,
    };

    this.pumps.set(ip, state);
    this.emit('status-changed', { ip, status: state.status });

    try {
      await client.connectTCP(ip, { port, timeout: MODBUS_CONNECT_TIMEOUT_MS });

      if (!this.isCurrentState(ip, state)) {
        this.closeClient(client);
        return;
      }

      client.setID(1); // Default unit ID
      client.setTimeout(MODBUS_TIMEOUT_MS);

      await client.readHoldingRegisters(MODBUS_REGISTERS.CYCLES_PENDING.address, 1);

      if (!this.isCurrentState(ip, state)) {
        this.closeClient(client);
        return;
      }

      state.status = 'CONNECTED';
      state.failCount = 0;
      this.emit('status-changed', { ip, status: state.status });

      state.pollInterval = setInterval(() => this.pollPump(ip), HEARTBEAT_INTERVAL_MS);
    } catch (error) {
      if (!this.isCurrentState(ip, state)) {
        this.closeClient(client);
        return;
      }

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
      await state.client.readHoldingRegisters(MODBUS_REGISTERS.CYCLES_PENDING.address, 1);

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
      this.closeClient(state.client);
      state.client = null;
    }

    // Remove from map to clean up memory
    this.pumps.delete(ip);

    this.emit('status-changed', { ip, status: 'DISCONNECTED' });
  }

  private isCurrentState(ip: string, state: PumpState) {
    return this.pumps.get(ip) === state;
  }

  private closeClient(client: ModbusRTU) {
    try {
      client.close(() => {});
    } catch {
      // Ignore close errors; the TCP socket may already be closed or unopened.
    }
  }
}

export const pumpManager = new PumpManager();
