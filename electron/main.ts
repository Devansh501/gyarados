import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { UDP_DISCOVERY_PORT, getDefaultModbusPort } from '../src/constants';
import { toUiDevice, toUiPumpStatus } from './ipcTypes';
import { connectivityEngine, aliveCheckPoller, verbosePoller } from './engines';
import { scanWifiDevices } from './scanner';
import { SerialPort } from 'serialport';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 600,
    title: 'Microlit connector',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    show: false, // Hide until ready-to-show
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // Show the main window once it is ready
  win.once('ready-to-show', () => {
    win?.show();
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  ipcMain.handle('scan-wifi-devices', async (_event, port = UDP_DISCOVERY_PORT) => {
    try {
      const devices = await scanWifiDevices(port, (device) => {
        if (win) {
          win.webContents.send('device-found', toUiDevice(device));
        }
      });
      return { success: true, devices: devices.map(toUiDevice) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('connect-pump', async (_event, ip: string, port?: number) => {
    try {
      await connectivityEngine.connectTCP(ip, port ?? getDefaultModbusPort());
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Connection failed' };
    }
  });

  ipcMain.handle('get-serial-ports', async () => {
    try {
      const allPorts = await SerialPort.list();
      
      const filteredPorts = allPorts.filter(p => {
        // Physical devices usually have a vendorId, pnpId, or manufacturer.
        if (p.vendorId || p.pnpId || p.manufacturer) return true;
        
        // As a fallback, include common USB/Serial port naming conventions
        const pathLower = p.path.toLowerCase();
        if (pathLower.includes('usb') || pathLower.includes('acm') || pathLower.includes('ama')) return true;
        
        // On Windows, keep COM ports
        if (process.platform === 'win32' && pathLower.startsWith('com')) return true;
        
        // Exclude default virtual/internal ports (like /dev/ttyS0 to ttyS31 on Linux)
        return false;
      });

      return { success: true, ports: filteredPorts.map(p => p.path) };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Failed to list ports' };
    }
  });

  ipcMain.handle(
    'scan-rtu-devices',
    async (
      _event,
      path: string,
      options: { baudRate: number; dataBits: 8 | 7 | 6 | 5; parity: 'none' | 'even' | 'mark' | 'odd' | 'space'; stopBits: 1 | 2 }
    ) => {
      try {
        const found = await connectivityEngine.scanAndConnectRTU(path, options);
        const devices = found.map(f => ({
          id: f.unitId.toString(),
          ip: f.id,
          status: 'connected',
        }));

        for (const device of devices) {
          if (win) {
            win.webContents.send('device-found', device);
          }
        }

        return { success: true, devices };
      } catch (error: any) {
        return { success: false, error: error?.message ?? 'RTU Scan failed' };
      }
    }
  );

  ipcMain.handle('disconnect-pump', async (_event, ip: string) => {
    connectivityEngine.disconnect(ip);
    return { success: true };
  });

  ipcMain.handle('write-register', async (_event, ip: string, register: number, value: number) => {
    try {
      await connectivityEngine.writeRegister(ip, register, value);
      return { success: true };
    } catch (error: any) {
      console.error(`[IPC] write-register failed for ${ip} reg ${register} val ${value}:`, error);
      return { success: false, error: error?.message ?? 'Failed to write register' };
    }
  });

  ipcMain.handle('start-verbose-polling', async (_event, ip: string) => {
    try {
      verbosePoller.start(ip);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Failed to start verbose polling' };
    }
  });

  ipcMain.handle('stop-verbose-polling', async (_event, ip: string) => {
    try {
      verbosePoller.stop(ip);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Failed to stop verbose polling' };
    }
  });

  connectivityEngine.on('status-changed', ({ ip, status }) => {
    if (win) {
      win.webContents.send('pump-status-changed', { ip, status: toUiPumpStatus(status) });
    }
  });

  aliveCheckPoller.on('pump-test-state', (data) => {
    if (win) {
      win.webContents.send('pump-test-state', data);
    }
  });

  verbosePoller.on('pump-state-update', (data) => {
    if (win) {
      win.webContents.send('pump-state-update', data);
    }
  });

  createWindow();
});
