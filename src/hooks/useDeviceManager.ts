import { useState, useEffect, useCallback } from 'react';
import { Device, normalizeDevice } from '../types/device';

export function useDeviceManager(setToastMessage: (msg: string) => void) {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleDeviceFound = (_event: any, device: { ip: string; id: number; status?: any; pumpType?: any }) => {
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

    const handlePumpMessage = (_event: any, msg: string) => {
      setToastMessage(msg);
    };

    const handlePumpTestState = (_event: any, data: { ip: string; state: number }) => {
      setDevices((prev) => {
        return prev.map((d) => {
          if (d.ip === data.ip) {
            return { ...d, isRunning: data.state === 1 };
          }
          return d;
        });
      });
    };

    window.ipcRenderer.on('device-found', handleDeviceFound);
    window.ipcRenderer.on('pump-status-changed', handleStatusChanged);
    window.ipcRenderer.on('pump-message', handlePumpMessage);
    window.ipcRenderer.on('pump-test-state', handlePumpTestState);

    return () => {
      window.ipcRenderer.removeAllListeners('device-found');
      window.ipcRenderer.removeAllListeners('pump-status-changed');
      window.ipcRenderer.removeAllListeners('pump-message');
      window.ipcRenderer.removeAllListeners('pump-test-state');
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
          result.devices.forEach((d: { ip: string; id: number; status?: any; pumpType?: any }) => {
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

  const scanRTU = useCallback(
    async (
      path: string,
      options: {
        baudRate: number;
        dataBits: 8 | 7 | 6 | 5;
        parity: 'none' | 'even' | 'mark' | 'odd' | 'space';
        stopBits: 1 | 2;
      }
    ) => {
      setIsScanning(true);
      setError(null);
      // For RTU, we might want to clear previous RTU devices for this path?
      // Just let the scan add new ones.
      
      try {
        const result = await window.ipcRenderer.invoke('scan-rtu-devices', path, options);
        if (!result.success) {
          setError(result.error || `Failed to scan RTU port ${path}`);
        } else if (result.devices && result.devices.length > 0) {
          // The device-found event handler will also catch them, but we can process here too
          setDevices((prev) => {
            const newDevices = [...prev];
            result.devices.forEach((d: { ip: string; id: number; status?: any; pumpType?: any }) => {
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
    },
    []
  );

  const disconnect = useCallback((ip: string) => {
    window.ipcRenderer.invoke('disconnect-pump', ip);
  }, []);

  const writeRegister = useCallback(async (ip: string, register: number, value: number) => {
    return await window.ipcRenderer.invoke('write-register', ip, register, value);
  }, []);

  return {
    devices,
    isScanning,
    error,
    scan,
    connect,
    scanRTU,
    disconnect,
    writeRegister,
  };
}
