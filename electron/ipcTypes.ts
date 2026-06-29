import type { PumpStatus } from './pumpManager';

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
      return 'disconnected';
  }
}

export function toUiDevice(device: { ip: string; deviceId: number }): UiDiscoveredDevice {
  return { ip: device.ip, id: device.deviceId };
}
