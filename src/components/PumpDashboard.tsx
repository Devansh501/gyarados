import { useEffect } from 'react';
import { PowerOff, ChevronLeft, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import type { Device } from '../types/device';
import { BasePumpDashboard } from './dashboards/BasePumpDashboard';

interface PumpDashboardProps {
  devices: Device[];
  selectedIp: string | null;

  onDisconnect: (ip: string) => void;
  onBack: () => void;
  writeRegister: (ip: string, register: number, value: number) => Promise<any>;
  startVerbosePolling: (ip: string) => void;
  stopVerbosePolling: (ip: string) => void;
}

export default function PumpDashboard({
  devices,
  selectedIp,

  onDisconnect,
  onBack,
  writeRegister,
  startVerbosePolling,
  stopVerbosePolling
}: PumpDashboardProps) {
  const connectedPumps = devices.filter(d => d.status === 'connected');
  const selectedPump = connectedPumps.find(d => d.ip === selectedIp) || connectedPumps[0];

  useEffect(() => {
    if (selectedPump?.ip) {
      startVerbosePolling(selectedPump.ip);
      return () => stopVerbosePolling(selectedPump.ip);
    }
  }, [selectedPump?.ip, startVerbosePolling, stopVerbosePolling]);

  if (!selectedPump) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen text-muted-foreground bg-background">
        <PowerOff size={48} className="mb-4 opacity-50 text-primary" />
        <h2 className="text-2xl font-semibold mb-2 text-foreground">No Pumps Connected</h2>
        <p className="mb-6 text-center max-w-sm text-sm">
          You have been disconnected from all pumps, or no pumps are currently available.
        </p>
        <Button onClick={onBack} variant="outline" className="border-border">
          Back to Discovery
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden relative">
      
      {/* Main Full-Screen Content */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* Header Bar */}
        <header className="flex flex-row items-center justify-between py-4 px-6 sm:px-10 border-b border-border/40 bg-background/95 backdrop-blur z-30 shrink-0 h-20">
          <div className="flex items-center gap-6">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="flex gap-2 text-muted-foreground border-border/50 hover:bg-muted/50 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> 
              <span className="hidden sm:inline font-medium">Back to Connected Devices</span>
            </Button>

            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-light tracking-tight text-foreground flex items-center gap-3">
                Pump {selectedPump.id}
                <span className={`flex h-2 w-2 rounded-full ${
                  (selectedPump.failCount || 0) > 0 
                    ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' 
                    : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                }`}></span>
              </h1>
              <span className="text-primary font-mono tracking-wider text-xs opacity-80 flex items-center gap-2">
                {selectedPump.ip} 
                <span className="opacity-50">|</span> 
                <span className="uppercase">{selectedPump.pumpType} Mode</span>
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => onDisconnect(selectedPump.ip)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <PowerOff size={18} className="sm:mr-2" /> 
            <span className="hidden sm:inline font-medium">Disconnect</span>
          </Button>
        </header>
        
        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto bg-background/50 relative">
          {connectedPumps.map(pump => {
            const isSelected = pump.ip === selectedPump.ip;
            
            if (pump.pumpType === 'base') {
              return (
                <div key={`base-${pump.ip}`} className={isSelected ? "block h-full" : "hidden"}>
                   <BasePumpDashboard device={pump} writeRegister={writeRegister} />
                </div>
              );
            }
            
            if (isSelected) {
              return (
                 <motion.div 
                   key={`unknown-${pump.ip}`}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="flex flex-col items-center justify-center h-full"
                 >
                   <Activity className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                   <h2 className="text-xl font-medium text-foreground">Dashboard Not Available</h2>
                   <p className="text-muted-foreground mt-2">The dashboard for {pump.pumpType} pump is not yet implemented.</p>
                 </motion.div>
              );
            }
            
            return null;
          })}
        </main>
      </div>
    </div>
  );
}
