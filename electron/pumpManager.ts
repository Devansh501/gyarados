import ModbusRTU from 'modbus-serial';
import { EventEmitter } from 'node:events';
import { MODBUS_REGISTERS } from '../src/registers';
import {
  getDefaultModbusPort,
  HEARTBEAT_INTERVAL_MS,
  MAX_POLL_FAILURES,
  MODBUS_CONNECT_TIMEOUT_MS,
  MODBUS_TIMEOUT_MS,
  MAX_RS485_DEVICES,
  RS485_DISCOVERY_REGISTER,
  RS485_CHECK_ALIVE_INTERVAL,
} from '../src/constants';

export type PumpStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export interface PumpState {
  id: string;
  type: 'tcp' | 'rtu';
  status: PumpStatus;
  failCount: number;
  testRegister?: number;
  // TCP specific
  ip?: string;
  client?: ModbusRTU | null;
  pollInterval?: NodeJS.Timeout | null;
  isPolling?: boolean;
  // RTU specific
  path?: string;
  unitId?: number;
}

import { SerialPortOptions } from 'modbus-serial/ModbusRTU';

interface SerialPortState {
  client: ModbusRTU;
  isPolling: boolean;
  pollInterval: NodeJS.Timeout | null;
  lastActionTime: number;
}

class PumpManager extends EventEmitter {
  private pumps: Map<string, PumpState> = new Map();
  private serialPorts: Map<string, SerialPortState> = new Map();

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
      id: ip,
      type: 'tcp',
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

  public async scanRTUDevices(path: string, options: SerialPortOptions): Promise<{ id: string; unitId: number }[]> {
    if (this.serialPorts.has(path)) {
      this.closeSerialPort(path);
    }

    const client = new ModbusRTU();
    try {
      await client.connectRTUBuffered(path, options);
    } catch (error) {
      console.error(`[PumpManager] Failed to open RTU port ${path}:`, error);
      throw error;
    }

    const portState: SerialPortState = {
      client,
      isPolling: false,
      pollInterval: null,
      lastActionTime: 0,
    };
    this.serialPorts.set(path, portState);

    const foundDevices: { id: string; unitId: number }[] = [];

    for (let unitId = 1; unitId <= MAX_RS485_DEVICES; unitId++) {
      client.setID(unitId);
      client.setTimeout(MODBUS_TIMEOUT_MS);
      try {
        const response = await client.readHoldingRegisters(RS485_DISCOVERY_REGISTER, 1);
        const pumpStateVal = response.data[0];
        
        const id = `${path}:${unitId}`;
        const state: PumpState = {
          id,
          type: 'rtu',
          path,
          unitId,
          status: 'CONNECTED',
          failCount: 0,
          testRegister: RS485_DISCOVERY_REGISTER,
        };
        
        this.pumps.set(id, state);
        foundDevices.push({ id, unitId });
        
        this.emit('status-changed', { ip: id, status: 'CONNECTED' });
        this.emit('pump-test-state', { ip: id, state: pumpStateVal });
      } catch (error) {
        // Timeout or error reading, ignore and continue scanning
      }
    }

    if (foundDevices.length > 0) {
      portState.pollInterval = setInterval(() => this.pollSerialPort(path), RS485_CHECK_ALIVE_INTERVAL);
    } else {
      this.closeSerialPort(path);
    }

    return foundDevices;
  }

  public disconnectPump(id: string) {
    this.handleDisconnect(id);
  }

  public async writeRegister(id: string, register: number, value: number) {
    const state = this.pumps.get(id);
    if (!state || state.status !== 'CONNECTED') {
      throw new Error('Pump is not connected');
    }

    if (state.type === 'tcp') {
      await state.client!.writeRegister(register, value);
    } else if (state.type === 'rtu') {
      const portState = this.serialPorts.get(state.path!);
      if (!portState) throw new Error('Serial port not available');
      
      // Wait for any ongoing polling to finish
      while (portState.isPolling) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      portState.isPolling = true;
      try {
        const now = Date.now();
        const timeSinceLast = now - portState.lastActionTime;
        if (timeSinceLast < 50) {
          await new Promise(resolve => setTimeout(resolve, 50 - timeSinceLast));
        }

        portState.client.setID(state.unitId!);
        await portState.client.writeRegister(register, value);
      } finally {
        portState.lastActionTime = Date.now();
        portState.isPolling = false;
      }
    }
  }

  private async pollPump(ip: string) {
    const state = this.pumps.get(ip);
    if (!state || !state.client || state.status !== 'CONNECTED' || state.isPolling) return;

    state.isPolling = true;

    try {
      const reg = state.testRegister ?? MODBUS_REGISTERS.CYCLES_PENDING.address;
      const res = await state.client.readHoldingRegisters(reg, 1);
      this.emit('pump-test-state', { ip, state: res.data[0] });

      if (!this.pumps.has(ip) || state.status !== 'CONNECTED') return;

      state.failCount = 0;
    } catch (error) {
      if (!this.pumps.has(ip) || state.status !== 'CONNECTED') return;

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

  private async pollSerialPort(path: string) {
    const portState = this.serialPorts.get(path);
    if (!portState || portState.isPolling) return;

    portState.isPolling = true;

    try {
      const devices = Array.from(this.pumps.values()).filter(p => p.type === 'rtu' && p.path === path && p.status === 'CONNECTED');
      
      if (devices.length === 0) {
        this.closeSerialPort(path);
        return;
      }

      for (const device of devices) {
        if (device.status !== 'CONNECTED') continue;

        const now = Date.now();
        const timeSinceLast = now - portState.lastActionTime;
        if (timeSinceLast < 50) {
          await new Promise(resolve => setTimeout(resolve, 50 - timeSinceLast));
        }

        portState.client.setID(device.unitId!);
        try {
          const reg = device.testRegister ?? RS485_DISCOVERY_REGISTER;
          const res = await portState.client.readHoldingRegisters(reg, 1);
          device.failCount = 0;
          this.emit('pump-test-state', { ip: device.id, state: res.data[0] });
        } catch (error) {
          device.failCount += 1;
          console.warn(`[PumpManager] RTU poll failed for ${device.id}. Fail count: ${device.failCount}`);
          if (device.failCount >= MAX_POLL_FAILURES) {
            console.error(`[PumpManager] Max fail count reached for ${device.id}. Disconnecting.`);
            this.handleDisconnect(device.id);
          }
        } finally {
          portState.lastActionTime = Date.now();
        }
      }
    } finally {
      portState.isPolling = false;
    }
  }

  private handleDisconnect(id: string) {
    const state = this.pumps.get(id);
    if (!state) return;

    if (state.type === 'tcp') {
      if (state.pollInterval) {
        clearInterval(state.pollInterval);
        state.pollInterval = null;
      }
      if (state.client) {
        this.closeClient(state.client);
        state.client = null;
      }
    }

    this.pumps.delete(id);
    this.emit('status-changed', { ip: id, status: 'DISCONNECTED' });
  }

  private closeSerialPort(path: string) {
    const portState = this.serialPorts.get(path);
    if (!portState) return;
    
    if (portState.pollInterval) {
      clearInterval(portState.pollInterval);
      portState.pollInterval = null;
    }
    
    this.closeClient(portState.client);
    this.serialPorts.delete(path);
  }

  private isCurrentState(ip: string, state: PumpState) {
    return this.pumps.get(ip) === state;
  }

  private closeClient(client: ModbusRTU) {
    try {
      client.close(() => {});
    } catch {
      // Ignore close errors
    }
  }
}

export const pumpManager = new PumpManager();
