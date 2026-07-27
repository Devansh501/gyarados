import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import SplashScreen from './SplashScreen';
import PumpDashboard from './components/PumpDashboard';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { ConnectionOptions } from './views/ConnectionOptions';
import { DiscoveryView } from './views/DiscoveryView';
import { RS485View } from './views/RS485View';
import { useDeviceManager } from './hooks/useDeviceManager';
import { APP_TOAST_TIMEOUT_MS, APP_SPLASH_SCREEN_DELAY_MS } from './constants';

function App() {
  const [isSplashing, setIsSplashing] = useState(true);
  const [activeTab, setActiveTab] = useState<'options' | 'wifi' | 'rs485' | 'dashboard'>('options');
  const [selectedPumpIp, setSelectedPumpIp] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { devices, isScanning, error, scan, connect, scanRTU, disconnect, writeRegister } = useDeviceManager(setToastMessage);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), APP_TOAST_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => {
      setIsSplashing(false);
    }, APP_SPLASH_SCREEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectPump = (ip: string) => {
    setSelectedPumpIp(ip);
    setActiveTab('dashboard');
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
                      {activeTab === 'options' && (
                        <ConnectionOptions onSelectOption={(tab) => setActiveTab(tab as any)} />
                      )}

                      {activeTab === 'wifi' && (
                        <DiscoveryView
                          devices={devices}
                          isScanning={isScanning}
                          error={error}
                          onBack={() => setActiveTab('options')}
                          onScan={scan}
                          onConnect={connect}
                          onSelectPump={handleSelectPump}
                        />
                      )}

                      {activeTab === 'rs485' && (
                        <RS485View
                          devices={devices}
                          isScanning={isScanning}
                          onBack={() => setActiveTab('options')}
                          onScanRTU={scanRTU}
                          onSelectPump={handleSelectPump}
                        />
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
                devices={devices as any}
                selectedIp={selectedPumpIp}
                onSelectPump={setSelectedPumpIp}
                onDisconnect={disconnect}
                onBack={() => setActiveTab('wifi')}
                writeRegister={writeRegister}
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
