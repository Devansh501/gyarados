import { useState } from 'react';
import { PowerOff, ChevronLeft, Menu, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import type { Device } from '../types/device';
import { BasePumpDashboard } from './dashboards/BasePumpDashboard';

interface PumpDashboardProps {
  devices: Device[];
  selectedIp: string | null;
  onSelectPump: (ip: string) => void;
  onDisconnect: (ip: string) => void;
  onBack: () => void;
  writeRegister: (ip: string, register: number, value: number) => Promise<any>;
}

export default function PumpDashboard({
  devices,
  selectedIp,
  onSelectPump,
  onDisconnect,
  onBack,
  writeRegister
}: PumpDashboardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const connectedPumps = devices.filter(d => d.status === 'connected');
  const selectedPump = connectedPumps.find(d => d.ip === selectedIp) || connectedPumps[0];

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

  const handlePumpSelect = (ip: string) => {
    onSelectPump(ip);
    setIsDrawerOpen(false);
  };

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden relative">
      
      {/* Framer Motion Side Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-card border-r border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border/50 bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-primary">Connected Pumps</h2>
                  <span className="text-xs font-mono bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">
                    {connectedPumps.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Select a device to configure</p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {connectedPumps.map((pump) => (
                    <button
                      key={pump.ip}
                      onClick={() => handlePumpSelect(pump.ip)}
                      className={`w-full text-left p-4 rounded-xl transition-all border outline-none flex items-center justify-between group ${
                        selectedPump.ip === pump.ip 
                          ? 'bg-primary/10 border-primary/30 text-foreground shadow-sm' 
                          : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${selectedPump.ip === pump.ip ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]' : 'bg-muted-foreground/50 group-hover:bg-muted-foreground'}`} />
                          Pump {pump.id || 'Unknown'}
                        </div>
                        <div className="text-xs font-mono opacity-70 mt-1 pl-4">{pump.ip}</div>
                      </div>
                      {selectedPump.ip === pump.ip && (
                        <ChevronLeft className="w-4 h-4 text-primary opacity-50 rotate-180" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border/50 bg-muted/10">
                 <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground justify-start" onClick={onBack}>
                   <ChevronLeft className="mr-2 h-4 w-4" /> Back to Discovery
                 </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Full-Screen Content */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* Header Bar */}
        <header className="flex flex-row items-center justify-between py-4 px-6 sm:px-10 border-b border-border/40 bg-background/95 backdrop-blur z-30 shrink-0 h-20">
          <div className="flex items-center gap-6">
            <Button 
              variant="outline" 
              onClick={() => setIsDrawerOpen(true)}
              className="flex gap-2 text-muted-foreground border-border/50 hover:bg-muted/50 hover:text-foreground"
            >
              <Menu className="h-4 w-4" /> 
              <span className="hidden sm:inline font-medium">Pumps Menu</span>
            </Button>

            <Separator orientation="vertical" className="h-8 bg-border/50 hidden sm:block" />

            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-light tracking-tight text-foreground flex items-center gap-3">
                Pump {selectedPump.id}
                <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
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
          <AnimatePresence mode="wait">
            {selectedPump.pumpType === 'base' && (
               <BasePumpDashboard key={`base-${selectedPump.ip}`} device={selectedPump} writeRegister={writeRegister} />
            )}
            {selectedPump.pumpType !== 'base' && (
               <motion.div 
                 key="unknown-pump"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="flex flex-col items-center justify-center h-full"
               >
                 <Activity className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                 <h2 className="text-xl font-medium text-foreground">Dashboard Not Available</h2>
                 <p className="text-muted-foreground mt-2">The dashboard for {selectedPump.pumpType} pump is not yet implemented.</p>
               </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
