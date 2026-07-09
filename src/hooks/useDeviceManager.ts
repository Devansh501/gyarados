import { useState, useEffect, useCallback } from 'react';
import { Device, normalizeDevice } from '../types/device';

export function useDeviceManager(setToastMessage: (msg: string) => void) {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleDeviceFound = (_event: any, device: { ip: string; id: number }) => {
      setDevices((prev) => {
        if (!prev.find((d) => d.ip === device.ip)) {
          return [...prev, normalizeDevice(device)];
        }
        return prev;
      });
    };

    const handleStatusChanged = (_event: any, data: { ip: string; status: Device['status'] }) => {
      setDevices((prev) => {
        if (data.status === 'disconnected') {
          const device = prev.find((d) => d.ip === data.ip);
          if (device) {
            setTimeout(() => setToastMessage(`Pump ID ${device.id || 'Unknown'} disconnected`), 0);
          }
          return prev.filter((d) => d.ip !== data.ip);
        }
        return prev.map((d) => {
          if (d.ip === data.ip) {
            return { ...d, status: data.status };
          }
          return d;
        });
      });
    };

    window.ipcRenderer.on('device-found', handleDeviceFound);
    window.ipcRenderer.on('pump-status-changed', handleStatusChanged);

    return () => {
      window.ipcRenderer.removeAllListeners('device-found');
      window.ipcRenderer.removeAllListeners('pump-status-changed');
    };
  }, [setToastMessage]);

  const scan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setDevices((prev) => prev.filter((d) => d.status === 'connected' || d.status === 'connecting'));
    try {
      const result = await window.ipcRenderer.invoke('scan-wifi-devices');
      if (!result.success) {
        setError(result.error || 'Failed to scan network');
      } else if (result.devices && result.devices.length > 0) {
        setDevices((prev) => {
          const newDevices = [...prev];
          result.devices.forEach((d: { ip: string; id: number }) => {
            if (!newDevices.find((nd) => nd.ip === d.ip)) {
              newDevices.push(normalizeDevice(d));
            }
          });
          return newDevices;
        });
      }
    } catch (err: any) {
      setError(err.message || 'Unknown IPC Error');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const connect = useCallback(async (ip: string) => {
    setError(null);
    const result = await window.ipcRenderer.invoke('connect-pump', ip);
    if (!result.success) {
      setError(result.error || `Failed to connect to ${ip}`);
      setDevices((prev) =>
        prev.map((d) => (d.ip === ip ? { ...d, status: 'error' as const } : d))
      );
    }
  }, []);

  const disconnect = useCallback((ip: string) => {
    window.ipcRenderer.invoke('disconnect-pump', ip);
  }, []);

  return {
    devices,
    isScanning,
    error,
    scan,
    connect,
    disconnect,
  };
}
