import { motion } from 'framer-motion';
import { Wifi, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { RadarAnimation } from '../components/animations/RadarAnimation';
import { ANIMATION_LIST_DELAY_MULT } from '../constants';
import { Device } from '../types/device';

interface Props {
  devices: Device[];
  isScanning: boolean;
  error: string | null;
  onBack: () => void;
  onScan: () => void;
  onConnect: (ip: string) => void;
  onSelectPump: (ip: string) => void;
  onViewConnected: () => void;
}

export function DiscoveryView({ devices, isScanning, error, onBack, onScan, onConnect, onSelectPump, onViewConnected }: Props) {
  const connectedCount = devices.filter(d => d.status === 'connected').length;
  return (
    <motion.div 
      key="wifi"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full min-h-[500px]"
    >
      <Button variant="ghost" className="self-start -ml-4 mb-8 text-muted-foreground hover:text-foreground" onClick={onBack}>
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
          <Button size="lg" className="px-8 shadow-md" onClick={onScan}>
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
            <div className="flex gap-2">
              {connectedCount > 0 && (
                <Button variant="secondary" size="sm" onClick={onViewConnected} className="text-xs">
                  View Connected ({connectedCount})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onScan} className="text-xs">
                Rescan
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {devices.map((device, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * ANIMATION_LIST_DELAY_MULT }}
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
                    onClick={() => onSelectPump(device.ip)}
                  >
                    Dashboard
                  </Button>
                ) : device.status === 'connecting' ? (
                  <Button disabled variant="secondary" className="font-medium">Connecting...</Button>
                ) : (
                  <Button 
                    variant="secondary"
                    onClick={() => onConnect(device.ip)}
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
  );
}
