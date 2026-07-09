import { motion } from 'framer-motion';
import { Wifi, Server, ChevronRight } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/card';

interface Props {
  onSelectOption: (option: 'wifi' | 'usb') => void;
}

export function ConnectionOptions({ onSelectOption }: Props) {
  return (
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
          onClick={() => onSelectOption('wifi')}
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
  );
}
