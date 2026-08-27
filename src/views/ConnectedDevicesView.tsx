import { motion } from 'framer-motion';
import { Cable, ChevronLeft, CheckCircle2, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ANIMATION_LIST_DELAY_MULT } from '../constants';
import { Device } from '../types/device';

interface Props {
  devices: Device[];
  onBack: () => void;
  onSelectPump: (ip: string) => void;
}

export function ConnectedDevicesView({ devices, onBack, onSelectPump }: Props) {
  const connectedDevices = devices.filter((d) => d.status === 'connected');

  return (
    <motion.div
      key="connected"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full min-h-[500px]"
    >
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" className="-ml-4 text-muted-foreground hover:text-foreground" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Back to Options
        </Button>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-medium tracking-tight mb-2 flex items-center gap-3">
          Connected Devices
        </h2>
        <p className="text-muted-foreground">
          Select a connected pump to view its dashboard.
        </p>
      </div>

      {connectedDevices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-border/40 bg-muted/5 rounded-2xl p-12">
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
            <Cable className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No Devices Connected</h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs mb-8">Go back to scan and connect to pumps on your network or serial ports.</p>
          <Button size="lg" className="px-8 shadow-md" onClick={onBack}>
            Discover Pumps
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="text-green-500 w-5 h-5" />
              {connectedDevices.length} {connectedDevices.length === 1 ? 'Pump' : 'Pumps'} Active
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedDevices.map((device, i) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * ANIMATION_LIST_DELAY_MULT }}
                key={device.ip}
                className="flex flex-col justify-between p-6 bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all group cursor-pointer"
                onClick={() => onSelectPump(device.ip)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors text-lg flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        (device.failCount || 0) > 0
                          ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                          : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                      }`} />
                      Pump {device.id || 'Unknown'}
                    </div>
                    <div className="text-muted-foreground font-mono text-sm">{device.ip}</div>
                  </div>
                  <Activity className="w-5 h-5 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:text-primary transition-colors" />
                </div>
                
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary/80 bg-primary/10 w-fit px-2 py-1 rounded-md">
                  {device.pumpType || 'base'} Mode
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
