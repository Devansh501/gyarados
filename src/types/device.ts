export interface Device {
  ip: string;
  id?: number;
  status?: 'available' | 'connecting' | 'connected' | 'error' | 'disconnected';
}

export function normalizeDevice(device: { ip: string; id?: number; deviceId?: number }): Device {
  return {
    ip: device.ip,
    id: device.id ?? device.deviceId,
    status: 'available',
  };
}
