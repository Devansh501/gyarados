export interface ModbusRegister {
  address: number;
  defaultValue?: number;
  description?: string;
}

export const MODBUS_REGISTERS = {
  DEVICE_ID: { 
    address: 0, 
    defaultValue: 9000, 
    description: 'Device ID (e.g. model number)' 
  },
  CYCLES_PENDING: { 
    address: 123, 
    defaultValue: 1, 
    description: 'Number of cycles pending execution' 
  },
} as const satisfies Record<string, ModbusRegister>;
