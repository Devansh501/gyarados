import ModbusRTU from 'modbus-serial';

export type PumpStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
export type PumpType = 'base' | 'clever' | 'intelligent';

export interface DeviceState {
  id: string;
  type: 'tcp' | 'rtu';
  status: PumpStatus;
  pumpType: PumpType;
  failCount: number;
  client: ModbusRTU;
  // TCP specific
  ip?: string;
  // RTU specific
  path?: string;
  unitId?: number;
}
