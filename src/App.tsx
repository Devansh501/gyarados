import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, Server, AlertCircle } from 'lucide-react';
import SplashScreen from './SplashScreen';
import './App.css';

interface Device {
  ip: string;
  id?: number;
  status?: 'available' | 'connecting' | 'connected' | 'error';
}

function normalizeDevice(device: { ip: string; id?: number; deviceId?: number }): Device {
  return {
    ip: device.ip,
    id: device.id ?? device.deviceId,
    status: 'available',
  };
}

function App() {
  const [isSplashing, setIsSplashing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'options' | 'wifi' | 'usb'>('options');

  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => {
      setIsSplashing(false);
    }, 3500);

    // Setup IPC listeners
    window.ipcRenderer.on('device-found', (_event: any, device: { ip: string; id: number }) => {
      setDevices((prev) => {
        if (!prev.find((d) => d.ip === device.ip)) {
          return [...prev, normalizeDevice(device)];
        }
        return prev;
      });
    });

    window.ipcRenderer.on('pump-status-changed', (_event: any, data: { ip: string; status: Device['status'] }) => {
      setDevices((prev) => {
        return prev.map((d) => {
          if (d.ip === data.ip) {
            return { ...d, status: data.status };
          }
          return d;
        });
      });
    });

    return () => {
      clearTimeout(timer);
      window.ipcRenderer.removeAllListeners('device-found');
      window.ipcRenderer.removeAllListeners('pump-status-changed');
    };
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setDevices([]);
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
  };

  const handleConnect = async (ip: string) => {
    setError(null);
    const result = await window.ipcRenderer.invoke('connect-pump', ip);
    if (!result.success) {
      setError(result.error || `Failed to connect to ${ip}`);
      setDevices((prev) =>
        prev.map((d) => (d.ip === ip ? { ...d, status: 'error' as const } : d))
      );
    }
  };

  const handleDisconnect = (ip: string) => {
    window.ipcRenderer.invoke('disconnect-pump', ip);
  };

  return (
    <div className="app-wrapper">
      <AnimatePresence>
        {isSplashing && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{ position: 'absolute', inset: 0, zIndex: 50 }}
          >
            <SplashScreen />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container">
        <header className="header">
          <div className="header-status">System Online</div>
          <h1>Connection Manager</h1>
          <p className="subtitle">Select connection method to pair with Microlit Pump</p>
        </header>

        {activeTab === 'options' && (
          <div className="connection-options">
            <button 
              className="option-card highlight"
              onClick={() => setActiveTab('wifi')}
            >
              <Wifi size={32} className="icon" />
              <h2>Wi-Fi Discovery</h2>
              <p>Automatically scan the local network for connected pumps.</p>
            </button>
            
            <button className="option-card">
              <Server size={32} className="icon" />
              <h2>Manual IP</h2>
              <p>Connect directly using a known static IP address.</p>
            </button>
          </div>
        )}

        {activeTab === 'wifi' && (
          <div className="discovery-section">
            <button className="back-btn" onClick={() => setActiveTab('options')}>
              ← Back to Options
            </button>

            <div className="wifi-panel">
              <h2>Network Discovery</h2>
              <p>Broadcast UDP discovery on port 5555, then connect via Modbus TCP.</p>
              
              <button 
                className="scan-btn" 
                onClick={handleScan}
                disabled={isScanning}
              >
                {isScanning ? 'Scanning...' : 'Start Scan'}
              </button>

              {error && (
                <div className="error-box">
                  <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
                  {error}
                </div>
              )}

              <div className="device-list">
                {devices.length === 0 && !isScanning && !error && (
                  <div className="empty-state">No devices found.</div>
                )}
                
                {devices.map((device) => (
                  <div key={device.ip} className="device-card">
                    <div className="device-info">
                      <strong>Pump Model {device.id || 'Unknown'}</strong>
                      <span>{device.ip}</span>
                    </div>
                    
                    {device.status === 'connected' ? (
                       <button className="connect-btn" style={{backgroundColor: '#ef4444'}} onClick={() => handleDisconnect(device.ip)}>
                         Disconnect
                       </button>
                    ) : device.status === 'connecting' ? (
                       <button className="connect-btn" disabled>Connecting...</button>
                    ) : (
                       <button className="connect-btn" onClick={() => handleConnect(device.ip)}>
                         {device.status === 'error' ? 'Retry' : 'Connect'}
                       </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
