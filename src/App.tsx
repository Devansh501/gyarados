import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, Server, AlertCircle, ChevronRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import SplashScreen from './SplashScreen';
import PumpDashboard from './components/PumpDashboard';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { Card, CardContent, CardDescription, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';

export interface Device {
  ip: string;
  id?: number;
  status?: 'available' | 'connecting' | 'connected' | 'error' | 'disconnected';
}

function normalizeDevice(device: { ip: string; id?: number; deviceId?: number }): Device {
  return {
    ip: device.ip,
    id: device.id ?? device.deviceId,
    status: 'available',
  };
}

const RadarAnimation = () => (
  <div className="relative w-40 h-40 flex items-center justify-center my-6 mx-auto">
    <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
    <Wifi className="text-primary z-10 w-10 h-10" />
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full border-2 border-primary/30 bg-primary/5"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 2.5, opacity: [0, 0.8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
      />
    ))}
  </div>
);

function App() {
  const [isSplashing, setIsSplashing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'options' | 'wifi' | 'usb' | 'dashboard'>('options');
  const [selectedPumpIp, setSelectedPumpIp] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden relative">
        <AnimatePresence>
          {isSplashing && (
            <motion.div
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-0 z-50"
            >
              <SplashScreen />
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab !== 'dashboard' && (
          <div className="absolute right-6 top-6 z-40">
            <ThemeToggle />
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab !== 'dashboard' && (
            <motion.div 
              key="split-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col lg:flex-row w-full h-full"
            >
              {/* LEFT PANE - Brand Focus */}
              <div className="hidden lg:flex w-5/12 bg-zinc-950 border-r border-border/30 relative flex-col justify-between p-12 overflow-hidden text-zinc-100">
                {/* Abstract Background Elements */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl mb-8 flex items-center justify-center border border-zinc-700/50 shadow-inner">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <h1 className="text-4xl xl:text-5xl font-light tracking-tight leading-tight mb-4">
                    Welcome to <br />
                    <span className="font-semibold text-white">Microlit OS.</span>
                  </h1>
                  <p className="text-zinc-400 max-w-sm leading-relaxed">
                    Establish a secure connection to your hardware network to access advanced diagnostics, precision fluid control, and real-time telemetry.
                  </p>
                </div>

                <div className="relative z-10 flex items-center gap-4 text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  System Online / Discovery Ready
                </div>
              </div>

              {/* RIGHT PANE - Interactive Forms */}
              <div className="flex-1 bg-background relative flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-12 md:p-16 xl:p-24 flex flex-col justify-center">
                  <div className="max-w-xl w-full mx-auto">
                    <AnimatePresence mode="wait">
                      
                      {/* VIEW: Select Method */}
                      {activeTab === 'options' && (
                        <motion.div 
                          key="options"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-8"
                        >
                          <div>
                            <h2 className="text-3xl font-medium tracking-tight mb-2">Connect Device</h2>
                            <p className="text-muted-foreground">Select your preferred method to pair a peristaltic pump to the dashboard.</p>
                          </div>

                          <div className="grid gap-4">
                            <Card 
                              className="cursor-pointer border-border/40 hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center p-6 group shadow-sm hover:shadow-md"
                              onClick={() => setActiveTab('wifi')}
                            >
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-6 group-hover:scale-110 transition-transform">
                                <Wifi className="text-primary w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-xl mb-1">Wi-Fi Discovery</CardTitle>
                                <CardDescription className="text-sm">Scan local subnet for active devices</CardDescription>
                              </div>
                              <ChevronRight className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Card>
                            
                            <Card className="cursor-pointer border-border/40 hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center p-6 group shadow-sm hover:shadow-md opacity-70">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-6 group-hover:scale-110 transition-transform">
                                <Server className="text-primary w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-xl mb-1">Manual IP</CardTitle>
                                <CardDescription className="text-sm">Enter a static IP address</CardDescription>
                              </div>
                              <ChevronRight className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Card>
                          </div>
                        </motion.div>
                      )}

                      {/* VIEW: Network Discovery */}
                      {activeTab === 'wifi' && (
                        <motion.div 
                          key="wifi"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="flex flex-col h-full min-h-[500px]"
                        >
                          <Button variant="ghost" className="self-start -ml-4 mb-8 text-muted-foreground hover:text-foreground" onClick={() => setActiveTab('options')}>
                            <ChevronLeft className="w-4 h-4 mr-2" /> Back
                          </Button>

                          <div className="mb-8">
                            <h2 className="text-3xl font-medium tracking-tight mb-2 flex items-center gap-3">
                              Network Radar
                              {isScanning && <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />}
                            </h2>
                            <p className="text-muted-foreground">Broadcasting UDP queries to identify active pumps.</p>
                          </div>

                          {error && (
                            <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg flex items-center text-sm font-mono mb-6 animate-in fade-in">
                              <AlertCircle size={16} className="mr-3 shrink-0" />
                              {error}
                            </div>
                          )}

                          {isScanning ? (
                            <div className="flex-1 flex flex-col items-center justify-center border border-border/40 bg-muted/10 rounded-2xl p-12">
                              <RadarAnimation />
                              <h3 className="text-lg font-medium mt-6 text-foreground">Scanning Subnet...</h3>
                              <p className="text-sm text-muted-foreground font-mono mt-2">Searching port 5555</p>
                            </div>
                          ) : devices.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center border border-border/40 bg-muted/5 rounded-2xl p-12">
                              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                                <Wifi className="w-8 h-8 text-muted-foreground opacity-50" />
                              </div>
                              <h3 className="text-lg font-medium text-foreground">No Devices Found</h3>
                              <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs mb-8">Ensure your pump is powered on and connected to the same network.</p>
                              <Button size="lg" className="px-8 shadow-md" onClick={handleScan}>
                                Start Scan
                              </Button>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col">
                              <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  <CheckCircle2 className="text-green-500 w-5 h-5" />
                                  Found {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
                                </h3>
                                <Button variant="outline" size="sm" onClick={handleScan} className="text-xs">
                                  Rescan
                                </Button>
                              </div>

                              <div className="space-y-4">
                                {devices.map((device, i) => (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={device.ip} 
                                    className="flex flex-row justify-between items-center p-5 bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all group"
                                  >
                                    <div>
                                      <div className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors text-lg">Pump Model {device.id || 'Unknown'}</div>
                                      <div className="text-muted-foreground font-mono text-xs">{device.ip}</div>
                                    </div>
                                    
                                    {device.status === 'connected' ? (
                                      <Button 
                                        className="bg-primary text-primary-foreground font-medium shadow-md hover:shadow-lg transition-all"
                                        onClick={() => {
                                          setSelectedPumpIp(device.ip);
                                          setActiveTab('dashboard');
                                        }}
                                      >
                                        Dashboard
                                      </Button>
                                    ) : device.status === 'connecting' ? (
                                      <Button disabled variant="secondary" className="font-medium">Connecting...</Button>
                                    ) : (
                                      <Button 
                                        variant="secondary"
                                        onClick={() => handleConnect(device.ip)}
                                        className="font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                                      >
                                        {device.status === 'error' ? 'Retry' : 'Connect'}
                                      </Button>
                                    )}
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-20 flex"
            >
              <PumpDashboard
                devices={devices}
                selectedIp={selectedPumpIp}
                onSelectPump={setSelectedPumpIp}
                onDisconnect={handleDisconnect}
                onBack={() => setActiveTab('wifi')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Toasts */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 50, x: '-50%' }}
              className="fixed bottom-8 left-1/2 flex items-center gap-3 bg-foreground text-background px-6 py-4 rounded-xl shadow-2xl z-[100] font-medium"
            >
              <AlertCircle size={18} />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ThemeProvider>
  );
}

export default App;
