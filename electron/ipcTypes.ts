import type { PumpStatus } from './engines';

export type UiPumpStatus = 'available' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface UiDiscoveredDevice {
  ip: string;
  id: number;
}

export function toUiPumpStatus(status: PumpStatus): UiPumpStatus {
  switch (status) {
    case 'CONNECTING':
      return 'connecting';
    case 'CONNECTED':
      return 'connected';
    case 'DISCONNECTED':
    default:
      return 'disconnected';
  }
}

export function toUiDevice(device: any): UiDiscoveredDevice {
  const uniqueId = device.ip || device.id || device.deviceId;
  const numericId = device.deviceId ?? device.unitId ?? device.id;
  return { ip: uniqueId, id: numericId };
}
