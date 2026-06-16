import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './components/SplashBackground.css';

const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('SYSTEM BOOT');

  useEffect(() => {
    // Simulate a reliable, linear loading process typical of hardware interfaces
    const duration = 2500; // 2.5 seconds
    const interval = 30;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const p = currentStep / steps;
      // Linear progress for technical feel, slight ease at the very end
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
    <div className="splash-container">
      <motion.div 
        className="splash-content-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div 
          className="logo-container"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <img src="/logo.png" alt="Microlit Logo" className="logo-img" />
        </motion.div>

        <motion.div 
          className="text-container"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h2 className="company-name">Microlit</h2>
          <h1 className="product-name">Peristaltic Pump</h1>
        </motion.div>

        <motion.div 
          className="loading-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="loading-header">
            <span className="status-text">{statusText}</span>
            <span className="percentage">{progress.toFixed(1)}%</span>
          </div>
          <div className="progress-track">
            <motion.div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
              layout
              transition={{ type: 'tween', ease: 'linear', duration: 0.03 }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
