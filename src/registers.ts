export interface ModbusRegister {
  address: number;
  defaultValue?: number;
  description?: string;
}

// These are base registers (S-series) we know we need
export const MODBUS_REGISTERS = {
  DEVICE_ID: { 
    address: 1018, // Actually Manufacturer info or Product info
    defaultValue: 0, 
    description: 'Device ID (e.g. model number)' 
  },
  CYCLES_PENDING: { 
    address: 3102, // We'll just map CYCLES_PENDING to running state to avoid breaking other files temporarily
    defaultValue: 0, 
    description: 'Running state (Stop: 0, Start: 1)' 
  },
} as const satisfies Record<string, ModbusRegister>;

// Configuration registers (Holding registers) 
// Base (S-series)
export const S_SERIES_HOLDING = {
  RPM: 3100,            // 0.1 RPM units
  DIRECTION: 3101,      // 0: CW, 1: CCW
  RUN_STATE: 3102,      // 0: Stop, 1: Start
  RUN_TIME: 3109,       // 0.1s units
  PAUSE_TIME: 3110,     // 0.1s units
  CYCLES: 3111,         // Count
};

// Clever (L-series) / Intelligent (F-series)
// For F-series from PDF:
export const F_SERIES_INPUT = {
  CURRENT_STEPS: 1004,
  REQ_STEPS: 1006,
  CURRENT_TIME: 1008,
  CURRENT_VOLUME: 1010, // 4 bytes (Long int)
  CURRENT_CYCLES: 1012, // 4 bytes (Long int)
};

// Let's define the poll blocks
export const PUMP_POLL_CONFIG = {
  base: {
    holding: [
      { start: 3100, length: 3 }, // RPM, DIRECTION, RUN_STATE
      { start: 3109, length: 3 }  // RUN_TIME, PAUSE_TIME, CYCLES
    ],
    input: null, // S series doesn't have live progress input registers
  },
  clever: {
    holding: [
      { start: 3100, length: 3 },
      { start: 3109, length: 3 }
    ],
    input: [
      { start: 1000, length: 14 }
    ],   // 1000 to 1013
  },
  intelligent: {
    holding: [
      { start: 3100, length: 3 },
      { start: 3109, length: 3 }
    ],
    input: [
      { start: 1000, length: 14 }
    ],
  },
};
