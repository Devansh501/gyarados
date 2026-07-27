import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Loader2, RotateCw, RotateCcw, Activity, Clock, Repeat, Hourglass } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Device } from '../../types/device';

interface BasePumpDashboardProps {
  device: Device;
  writeRegister: (ip: string, register: number, value: number) => Promise<any>;
}

export function BasePumpDashboard({ device, writeRegister }: BasePumpDashboardProps) {
  const [runTime, setRunTime] = useState<number>(60);
  const [pauseTime, setPauseTime] = useState<number>(5);
  const [cycles, setCycles] = useState<number>(1);
  const [rpm, setRpm] = useState<number>(150);
  const [direction, setDirection] = useState<0 | 1>(0); // 0: CW, 1: CCW
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Cycle tracking state
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const totalCycleTime = runTime + pauseTime;

  // Auto-start if hardware is running and we aren't tracking
  useEffect(() => {
    if (device.isRunning && !isPlaying) {
      setIsPlaying(true);
      setSessionStartTime(Date.now());
      setElapsedTime(0);
    }
  }, [device.isRunning]); // Only start, don't stop (since it drops to 0 during pause)

  // Timer loop for the macro cycle
  useEffect(() => {
    if (isPlaying && sessionStartTime) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - sessionStartTime) / 1000;
        
        // Auto-stop when macro cycle completes
        if (elapsed >= totalCycleTime * cycles) {
          setIsPlaying(false);
          setSessionStartTime(null);
          setElapsedTime(0);
        } else {
          setElapsedTime(elapsed);
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, sessionStartTime, totalCycleTime, cycles]);

  const currentCycle = isPlaying ? Math.min(cycles, Math.floor(elapsedTime / totalCycleTime) + 1) : 0;
  const timeInCurrentCycle = elapsedTime % totalCycleTime;
  const currentPhase = isPlaying ? (timeInCurrentCycle <= runTime ? 'Dispensing' : 'Paused') : 'Idle';
  const phaseTimeRemaining = isPlaying 
    ? (currentPhase === 'Dispensing' ? runTime - timeInCurrentCycle : totalCycleTime - timeInCurrentCycle) 
    : 0;

  const handleTogglePlay = async () => {
    setIsSyncing(true);
    try {
      if (isPlaying) {
        // Stop
        await writeRegister(device.ip, 3102, 0);
        setIsPlaying(false);
        setSessionStartTime(null);
        setElapsedTime(0);
      } else {
        // Apply settings before starting
        await writeRegister(device.ip, 3100, Math.round(rpm * 10)); // Scale RPM to 0.1 units
        await writeRegister(device.ip, 3101, direction);
        await writeRegister(device.ip, 3109, Math.round(runTime * 10)); // Scale to 0.1s units
        await writeRegister(device.ip, 3110, Math.round(pauseTime * 10)); // Scale to 0.1s units
        await writeRegister(device.ip, 3111, cycles);
        
        // Start
        await writeRegister(device.ip, 3102, 1);
        setIsPlaying(true);
        setSessionStartTime(Date.now());
        setElapsedTime(0);
      }
    } catch (error) {
      console.error('Failed to toggle pump state:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-4 sm:p-6 h-full flex flex-col max-w-5xl mx-auto space-y-4 lg:space-y-6"
    >
      <div className="flex flex-col text-center items-center justify-center mb-2">
        <h2 className="text-2xl font-light tracking-tight text-foreground">Dispense Cycles</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 flex-1 min-h-0">
        
        {/* Timing & Cycles */}
        <motion.div 
          whileHover={{ y: -1 }}
          className="p-5 bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/5 rounded-2xl relative overflow-hidden group flex flex-col justify-between min-h-0"
        >
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-inner">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium tracking-tight text-foreground">Cycle Timing</h3>
                <p className="text-xs text-muted-foreground">Adjust operation duration</p>
              </div>
            </div>
            
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Play className="w-3 h-3 text-green-500" /> Run Time
                </label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    value={runTime} 
                    onChange={(e) => setRunTime(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    className="h-10 font-mono text-xl bg-background/50 border-border/50 text-foreground text-center rounded-lg shadow-inner focus:ring-primary/20"
                    step="0.1"
                  />
                  <span className="text-muted-foreground font-mono text-sm font-medium">sec</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Hourglass className="w-3 h-3 text-orange-500" /> Pause Time
                </label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    value={pauseTime} 
                    onChange={(e) => setPauseTime(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    className="h-10 font-mono text-xl bg-background/50 border-border/50 text-foreground text-center rounded-lg shadow-inner focus:ring-primary/20"
                    step="0.1"
                  />
                  <span className="text-muted-foreground font-mono text-sm font-medium">sec</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Repeat className="w-3 h-3 text-blue-500" /> Cycles
                </label>
                <div className="flex items-center gap-3 w-1/2">
                  <Input 
                    type="number" 
                    value={cycles} 
                    onChange={(e) => setCycles(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10 font-mono text-xl bg-background/50 border-border/50 text-foreground text-center rounded-lg shadow-inner focus:ring-primary/20"
                    min="1"
                    max="999"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Speed & Actions */}
        <div className="space-y-4 lg:space-y-6 flex flex-col h-full min-h-0">
          <motion.div 
            whileHover={{ y: -1 }}
            className="p-5 bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/5 rounded-2xl relative overflow-hidden group flex-1 flex flex-col justify-between min-h-0"
          >
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shadow-inner">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium tracking-tight text-foreground">Motor Config</h3>
                <p className="text-xs text-muted-foreground">Adjust speed and direction</p>
              </div>
            </div>

            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-5 bg-background/40 rounded-xl border border-border/30 shadow-inner relative overflow-hidden group/speed">
                  {/* Decorative background glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none transition-colors group-hover/speed:from-blue-500/10" />
                  
                  <label className="absolute top-3 left-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Speed Rating
                  </label>

                  <div className="text-5xl font-mono font-light text-foreground tracking-tighter mt-4 mb-5 z-10 flex items-baseline gap-2">
                    {rpm} <span className="text-xs font-bold text-blue-500/80 uppercase tracking-widest">RPM</span>
                  </div>
                  
                  <div className="w-full relative z-10 px-2">
                    <Slider 
                      value={[rpm]} 
                      onValueChange={(val) => setRpm(Array.isArray(val) ? val[0] : val as number)}
                      max={350} 
                      min={1} 
                      step={1} 
                      className="cursor-pointer" 
                    />
                    <div className="w-full flex justify-between px-1 mt-3">
                       <span className="text-[10px] text-muted-foreground/60 font-mono font-medium">1</span>
                       <span className="text-[10px] text-muted-foreground/40 font-mono font-medium">175</span>
                       <span className="text-[10px] text-muted-foreground/60 font-mono font-medium">350</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rotation Direction</label>
                <div className="grid grid-cols-2 gap-3 bg-background/50 p-1 rounded-xl border border-border/30">
                  <Button 
                    variant={direction === 0 ? 'default' : 'ghost'}
                    className={`h-10 rounded-lg text-xs font-medium transition-all ${direction === 0 ? 'shadow-md bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    onClick={() => setDirection(0)}
                  >
                    <RotateCw className="w-3 h-3 mr-2" /> Clockwise
                  </Button>
                  <Button 
                    variant={direction === 1 ? 'default' : 'ghost'}
                    className={`h-10 rounded-lg text-xs font-medium transition-all ${direction === 1 ? 'shadow-md bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    onClick={() => setDirection(1)}
                  >
                    <RotateCcw className="w-3 h-3 mr-2" /> Anti-Clockwise
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="space-y-4">
             {isPlaying && (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }} 
                 animate={{ opacity: 1, height: 'auto' }} 
                 className="bg-background/80 border border-border/50 rounded-2xl p-4 flex justify-between items-center shadow-inner"
               >
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cycle</span>
                   <span className="text-xl font-mono text-foreground font-medium">{currentCycle} <span className="text-sm text-muted-foreground">/ {cycles}</span></span>
                 </div>
                 <div className="flex flex-col items-center">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phase</span>
                   <span className={`text-sm font-bold ${currentPhase === 'Dispensing' ? 'text-green-500' : 'text-orange-500'}`}>{currentPhase}</span>
                 </div>
                 <div className="flex flex-col text-right">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Time</span>
                   <span className="text-xl font-mono text-foreground font-medium">{Math.max(0, phaseTimeRemaining).toFixed(1)}s</span>
                 </div>
               </motion.div>
             )}
             <Button 
               size="lg" 
               className={`w-full h-14 rounded-2xl text-lg font-medium shadow-xl transition-all duration-300 border-2 ${
                 isPlaying 
                   ? 'bg-destructive/10 border-destructive/30 hover:bg-destructive/20 text-destructive shadow-destructive/20' 
                   : 'bg-primary border-primary hover:bg-primary/90 text-primary-foreground shadow-primary/30'
               }`}
               disabled={isSyncing}
               onClick={handleTogglePlay}
             >
               {isSyncing ? (
                 <Loader2 className="w-5 h-5 animate-spin" />
               ) : isPlaying ? (
                 <>
                   <Square className="w-5 h-5 mr-3 fill-current" /> Stop Cycle
                 </>
               ) : (
                 <>
                   <Play className="w-5 h-5 mr-3 fill-current" /> Initialize Cycle
                 </>
               )}
             </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
