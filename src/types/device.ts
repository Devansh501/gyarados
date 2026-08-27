export interface PumpStateData {
  rpm?: number;
  direction?: 0 | 1;
  runTime?: number;
  pauseTime?: number;
  cycles?: number;
  isPlaying?: boolean;
  // Live progress (for L/F series)
  currentCycle?: number;
  elapsedTime?: number;
  timeRemaining?: number;
  // Generic mapping of all raw read registers
  registers?: Record<number, number>;
}

export interface Device {
  ip: string;
  id?: number;
  status?: 'available' | 'connecting' | 'connected' | 'error' | 'disconnected';
  pumpType?: 'base' | 'clever' | 'intelligent';
  isRunning?: boolean;
  state?: PumpStateData;
  failCount?: number;
}

export function normalizeDevice(device: any): Device {
  const uniqueId = device.ip || device.id || device.deviceId;
  return {
    ip: uniqueId,
    id: device.id ?? device.deviceId,
    status: device.status || 'available',
    pumpType: device.pumpType || 'base',
    isRunning: device.isRunning || false,
    state: device.state || {},
    failCount: device.failCount || 0,
  };
}
