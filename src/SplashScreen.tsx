import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Progress } from './components/ui/progress';
import { Leaf } from 'lucide-react';

const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('SYSTEM BOOT');

  useEffect(() => {
    const duration = 2500;
    const interval = 30;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const p = currentStep / steps;
      const easeValue = p < 0.8 ? p : p + Math.sin((p - 0.8) * Math.PI * 2.5) * 0.05;
      const newProgress = easeValue * 100;
      
      setProgress(newProgress > 100 ? 100 : newProgress);

      if (newProgress > 15 && newProgress <= 45) setStatusText('ESTABLISHING CONNECTION');
      if (newProgress > 45 && newProgress <= 80) setStatusText('CALIBRATING SENSORS');
      if (newProgress > 80) setStatusText('READY');

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center select-none overflow-hidden" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Background Dots */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(hsl(var(--foreground)/0.08)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_30%,hsl(var(--background))_100%)] pointer-events-none" />

      <motion.div 
        className="relative z-10 flex flex-col items-center w-full max-w-sm px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div 
          className="w-24 h-24 mb-10 relative flex items-center justify-center bg-card rounded-2xl shadow-xl border border-border"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <img src="/logo.png" alt="Microlit Logo" className="w-16 h-16 object-contain z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          {/* Fallback if logo not found */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Leaf className="w-10 h-10 text-muted-foreground/30" />
          </div>
        </motion.div>

        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h2 className="text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase mb-3">Microlit</h2>
          <h1 className="text-3xl font-light tracking-tight text-foreground">Peristaltic Pump</h1>
        </motion.div>

        <motion.div 
          className="w-full flex flex-col gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="flex justify-between items-end px-1">
            <span className="font-mono text-[10px] font-semibold text-primary uppercase tracking-widest">{statusText}</span>
            <span className="font-mono text-[11px] font-medium text-muted-foreground">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
