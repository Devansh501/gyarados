import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { UDP_DISCOVERY_PORT, getDefaultModbusPort } from './constants/network';
import { toUiDevice, toUiPumpStatus } from './ipcTypes';
import { scanWifiDevices } from './scanner';
import { pumpManager } from './pumpManager';

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
      await pumpManager.connectPump(ip, port ?? getDefaultModbusPort());
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Connection failed' };
    }
  });

  ipcMain.handle('disconnect-pump', async (_event, ip: string) => {
    pumpManager.disconnectPump(ip);
    return { success: true };
  });

  pumpManager.on('status-changed', ({ ip, status }) => {
    if (win) {
      win.webContents.send('pump-status-changed', { ip, status: toUiPumpStatus(status) });
    }
  });

  createWindow();
});
