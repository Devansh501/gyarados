import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cable, ChevronLeft, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { RadarAnimation } from '../components/animations/RadarAnimation';
import { ANIMATION_LIST_DELAY_MULT } from '../constants';
import { Device } from '../types/device';

interface Props {
  devices: Device[];
  isScanning: boolean;
  onBack: () => void;
  onScanRTU: (
    path: string,
    options: {
      baudRate: number;
      dataBits: 8 | 7 | 6 | 5;
      parity: 'none' | 'even' | 'mark' | 'odd' | 'space';
      stopBits: 1 | 2;
    }
  ) => void;
  onSelectPump: (ip: string) => void;
}

export function RS485View({ devices, isScanning, onBack, onScanRTU, onSelectPump }: Props) {
  const [ports, setPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const dataBits = 8;
  const [parity, setParity] = useState<'none' | 'even' | 'mark' | 'odd' | 'space'>('none');
  const [stopBits, setStopBits] = useState<1 | 2>(1);
  const [isLoadingPorts, setIsLoadingPorts] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    async function loadPorts() {
      try {
        const result = await window.ipcRenderer.invoke('get-serial-ports');
        if (result.success) {
          setPorts(result.ports);
          if (result.ports.length > 0) {
            setSelectedPort(result.ports[0]);
          }
        } else {
          setError(result.error);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load ports');
      } finally {
        setIsLoadingPorts(false);
      }
    }
    loadPorts();
  }, []);

  const handleScan = () => {
    if (!selectedPort) {
      setError('Please select a port');
      return;
    }
    setError(null);
    setHasScanned(true);
    onScanRTU(selectedPort, { baudRate, dataBits, parity, stopBits });
  };

  const resetScan = () => {
    setHasScanned(false);
  };

  // Only show devices discovered on the selected port
  const currentDevices = devices.filter((d) => d.ip.startsWith(selectedPort + ':'));

  return (
    <motion.div
      key="rs485"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full min-h-[500px]"
    >
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" className="-ml-4 text-muted-foreground hover:text-foreground" onClick={hasScanned ? resetScan : onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" /> {hasScanned ? 'Change Settings' : 'Back'}
        </Button>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-medium tracking-tight mb-2 flex items-center gap-3">
          RS-485 Serial Connection
          {isScanning && <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse" />}
        </h2>
        <p className="text-muted-foreground">
          {hasScanned 
            ? `Scanning port ${selectedPort} for Modbus RTU devices.`
            : 'Configure Modbus RTU parameters to discover your pumps.'}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg flex items-center text-sm font-mono mb-6 animate-in fade-in">
          <AlertCircle size={16} className="mr-3 shrink-0" />
          {error}
        </div>
      )}

      {!hasScanned ? (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-border/40 bg-muted/10 rounded-2xl">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Port</label>
              {isLoadingPorts ? (
                <div className="h-10 px-3 py-2 bg-background border border-border rounded-md text-sm text-muted-foreground animate-pulse flex items-center">
                  Loading ports...
                </div>
              ) : (
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                >
                  {ports.length === 0 && <option value="">No ports found</option>}
                  {ports.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Baud Rate</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={baudRate}
                onChange={(e) => setBaudRate(parseInt(e.target.value))}
              >
                <option value="9600">9600</option>
                <option value="19200">19200</option>
                <option value="38400">38400</option>
                <option value="57600">57600</option>
                <option value="115200">115200</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Parity</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={parity}
                onChange={(e) => setParity(e.target.value as any)}
              >
                <option value="none">None</option>
                <option value="even">Even</option>
                <option value="odd">Odd</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Stop Bits</label>
              <select
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={stopBits}
                onChange={(e) => setStopBits(parseInt(e.target.value) as any)}
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              size="lg"
              className="px-8 shadow-md"
              disabled={isLoadingPorts || !selectedPort}
              onClick={handleScan}
            >
              <Search className="w-5 h-5 mr-2" />
              Start Scan
            </Button>
          </div>
        </div>
      ) : isScanning ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-border/40 bg-muted/10 rounded-2xl p-12">
          <RadarAnimation />
          <h3 className="text-lg font-medium mt-6 text-foreground">Scanning Unit IDs...</h3>
          <p className="text-sm text-muted-foreground font-mono mt-2">Checking IDs 1-20 on {selectedPort}</p>
        </div>
      ) : currentDevices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-border/40 bg-muted/5 rounded-2xl p-12">
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
            <Cable className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No Devices Found</h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs mb-8">Ensure your pump is powered on and connected to the correct port with the correct parameters.</p>
          <Button size="lg" className="px-8 shadow-md" onClick={handleScan}>
            Rescan Port
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="text-green-500 w-5 h-5" />
              Found {currentDevices.length} {currentDevices.length === 1 ? 'Device' : 'Devices'}
            </h3>
            <Button variant="outline" size="sm" onClick={handleScan} className="text-xs">
              Rescan
            </Button>
          </div>

          <div className="space-y-4">
            {currentDevices.map((device, i) => (
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
                ) : (
                  <Button disabled variant="secondary" className="font-medium">
                    {device.status}
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
