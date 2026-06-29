import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { PowerOff, Settings, Clock, Droplets, Activity, ChevronLeft, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Device } from '../App';

interface PumpDashboardProps {
  devices: Device[];
  selectedIp: string | null;
  onSelectPump: (ip: string) => void;
  onDisconnect: (ip: string) => void;
  onBack: () => void;
}

type Mode = 'menu' | 'time' | 'volume' | 'flow' | 'settings';

export default function PumpDashboard({
  devices,
  selectedIp,
  onSelectPump,
  onDisconnect,
  onBack
}: PumpDashboardProps) {
  const [activeMode, setActiveMode] = useState<Mode>('menu');
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
    setActiveMode('menu');
    setIsDrawerOpen(false);
  };

  const renderModeMenu = () => (
    <motion.div 
      key="menu"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 h-full p-6 sm:p-10 max-w-5xl mx-auto"
    >
      <Card className="cursor-pointer border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all flex flex-col items-center justify-center p-6 sm:p-10 text-center group bg-card shadow-sm" onClick={() => setActiveMode('time')}>
        <Clock size={48} className="mb-4 text-primary opacity-80 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300" />
        <CardTitle className="text-xl">Time Mode</CardTitle>
        <CardDescription className="mt-2 text-sm">Run pump for a specific duration</CardDescription>
      </Card>
      
      <Card className="cursor-pointer border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all flex flex-col items-center justify-center p-6 sm:p-10 text-center group bg-card shadow-sm" onClick={() => setActiveMode('volume')}>
        <Droplets size={48} className="mb-4 text-primary opacity-80 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300" />
        <CardTitle className="text-xl">Volume Mode</CardTitle>
        <CardDescription className="mt-2 text-sm">Dispense a specific volume</CardDescription>
      </Card>

      <Card className="cursor-pointer border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all flex flex-col items-center justify-center p-6 sm:p-10 text-center group bg-card shadow-sm" onClick={() => setActiveMode('flow')}>
        <Activity size={48} className="mb-4 text-primary opacity-80 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300" />
        <CardTitle className="text-xl">Flow Mode</CardTitle>
        <CardDescription className="mt-2 text-sm">Continuous operation at set rate</CardDescription>
      </Card>

      <Card className="cursor-pointer border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all flex flex-col items-center justify-center p-6 sm:p-10 text-center group bg-card shadow-sm" onClick={() => setActiveMode('settings')}>
        <Settings size={48} className="mb-4 text-primary opacity-80 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300" />
        <CardTitle className="text-xl">Settings</CardTitle>
        <CardDescription className="mt-2 text-sm">Hardware calibration & reset</CardDescription>
      </Card>
    </motion.div>
  );

  const renderTimeMode = () => (
    <motion.div 
      key="time"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-6 sm:p-10 h-full flex flex-col max-w-4xl mx-auto"
    >
      <Button variant="ghost" className="self-start mb-8 -ml-4 text-muted-foreground hover:text-foreground" onClick={() => setActiveMode('menu')}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Menu
      </Button>
      <div className="space-y-10 max-w-md">
        <div>
          <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest">Duration</h3>
          <div className="flex gap-4 items-center">
            <Input type="number" defaultValue={60} className="w-32 font-mono text-2xl h-14 bg-background border-border/50" />
            <span className="text-muted-foreground font-mono text-lg">seconds</span>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold text-primary mb-6 uppercase tracking-widest">Speed Level</h3>
          <Slider defaultValue={[50]} max={100} step={1} className="cursor-pointer py-4" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2 font-mono">
            <span>0%</span>
            <span className="text-foreground font-bold bg-muted px-3 py-1 rounded-full">50%</span>
            <span>100%</span>
          </div>
        </div>
        <Button size="lg" className="w-full text-lg h-14 mt-4 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
          Start Dispense
        </Button>
      </div>
    </motion.div>
  );

  const renderVolumeMode = () => (
    <motion.div 
      key="volume"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-6 sm:p-10 h-full flex flex-col max-w-4xl mx-auto"
    >
      <Button variant="ghost" className="self-start mb-8 -ml-4 text-muted-foreground hover:text-foreground" onClick={() => setActiveMode('menu')}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Menu
      </Button>
      <div className="space-y-10 max-w-md">
        <div>
          <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest">Target Volume</h3>
          <div className="flex gap-4 items-center">
            <Input type="number" defaultValue={250} className="w-32 font-mono text-2xl h-14 bg-background border-border/50" />
            <span className="text-muted-foreground font-mono text-lg">mL</span>
          </div>
        </div>
        <Button size="lg" className="w-full text-lg h-14 mt-4 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
          Start Dispense
        </Button>
      </div>
    </motion.div>
  );

  const renderFlowMode = () => (
    <motion.div 
      key="flow"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-6 sm:p-10 h-full flex flex-col max-w-4xl mx-auto"
    >
      <Button variant="ghost" className="self-start mb-8 -ml-4 text-muted-foreground hover:text-foreground" onClick={() => setActiveMode('menu')}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Menu
      </Button>
      <div className="space-y-10 max-w-md">
        <div>
          <h3 className="text-xs font-bold text-primary mb-3 uppercase tracking-widest">Flow Rate</h3>
          <div className="flex gap-4 items-center">
            <Input type="number" defaultValue={15} className="w-32 font-mono text-2xl h-14 bg-background border-border/50" />
            <span className="text-muted-foreground font-mono text-lg">mL/min</span>
          </div>
        </div>
        <div className="p-5 bg-muted/30 border border-border/50 rounded-xl">
          <h3 className="text-sm font-medium mb-2 text-foreground">Continuous Operation</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">The pump will run continuously at the set flow rate until manually stopped.</p>
        </div>
        <Button size="lg" className="w-full text-lg h-14 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
          Start Pump
        </Button>
      </div>
    </motion.div>
  );

  const renderSettings = () => (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-6 sm:p-10 h-full flex flex-col max-w-4xl mx-auto"
    >
      <Button variant="ghost" className="self-start mb-8 -ml-4 text-muted-foreground hover:text-foreground" onClick={() => setActiveMode('menu')}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Menu
      </Button>
      <div className="space-y-8">
        <div className="max-w-xl">
          <h3 className="text-xl font-semibold text-foreground mb-1">Hardware Calibration</h3>
          <p className="text-sm text-muted-foreground mb-6">Adjust physical parameters for accurate volume calculation.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Tubing Size (mm)</label>
              <Input type="number" defaultValue={3.2} className="font-mono h-14 text-lg bg-background border-border/50" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Steps / mL</label>
              <Input type="number" defaultValue={200} className="font-mono h-14 text-lg bg-background border-border/50" />
            </div>
          </div>
          <Button variant="secondary" className="mt-8 border border-border/50">
            Save Calibration
          </Button>
        </div>
        
        <Separator className="max-w-xl my-6 bg-border/50" />

        <div className="max-w-xl p-6 bg-destructive/5 rounded-xl border border-destructive/20">
          <h3 className="text-lg font-medium text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-6">Actions here are irreversible.</p>
          <Button variant="destructive" className="font-medium shadow-sm hover:bg-destructive/90 transition-colors">
            Factory Reset Device Settings
          </Button>
        </div>
      </div>
    </motion.div>
  );

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
              <span className="text-primary font-mono tracking-wider text-xs opacity-80">
                {selectedPump.ip}
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
            {activeMode === 'menu' && renderModeMenu()}
            {activeMode === 'time' && renderTimeMode()}
            {activeMode === 'volume' && renderVolumeMode()}
            {activeMode === 'flow' && renderFlowMode()}
            {activeMode === 'settings' && renderSettings()}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
