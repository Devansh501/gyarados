import { motion } from 'framer-motion';
import { Wifi } from 'lucide-react';
import { ANIMATION_RADAR_DURATION, ANIMATION_RADAR_DELAY_MULT } from '../../constants';

export const RadarAnimation = () => (
  <div className="relative w-40 h-40 flex items-center justify-center my-6 mx-auto">
    <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
    <Wifi className="text-primary z-10 w-10 h-10" />
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full border-2 border-primary/30 bg-primary/5"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 2.5, opacity: [0, 0.8, 0] }}
        transition={{ duration: ANIMATION_RADAR_DURATION, repeat: Infinity, delay: i * ANIMATION_RADAR_DELAY_MULT, ease: "easeOut" }}
      />
    ))}
  </div>
);
