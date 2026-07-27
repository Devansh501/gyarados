export interface Device {
  ip: string;
  id?: number;
  status?: 'available' | 'connecting' | 'connected' | 'error' | 'disconnected';
  pumpType?: 'base' | 'clever' | 'intelligent';
  isRunning?: boolean;
}

export function normalizeDevice(device: { ip: string; id?: number; deviceId?: number; status?: any; pumpType?: any; isRunning?: boolean }): Device {
  return {
    ip: device.ip,
    id: device.id ?? device.deviceId,
    status: device.status || 'available',
    pumpType: device.pumpType || 'base',
    isRunning: device.isRunning || false,
  };
}
