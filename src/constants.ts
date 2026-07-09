/** Network & Ports */
export const MODBUS_TCP_PORT = 502;
export const MODBUS_TCP_PORT_DEV = 5020;
export const UDP_DISCOVERY_PORT = 5555;

export function getDefaultModbusPort(): number {
  return process.env.VITE_DEV_SERVER_URL ? MODBUS_TCP_PORT_DEV : MODBUS_TCP_PORT;
}

/** Network Delays & Timeouts */
export const WIFI_SCAN_TIMEOUT_MS = 1500;
export const WIFI_DISCOVERY_RETRIES = 3;
export const WIFI_DISCOVERY_RETRY_DELAY_MS = 1000;
export const HEARTBEAT_INTERVAL_MS = 1000;
export const MODBUS_CONNECT_TIMEOUT_MS = 800;
export const MODBUS_TIMEOUT_MS = 400;
export const MAX_POLL_FAILURES = 3;

/** Application UI Delays */
export const APP_TOAST_TIMEOUT_MS = 3000;
export const APP_SPLASH_SCREEN_DELAY_MS = 3500;

/** Load Tester Delays */
export const LOAD_TEST_DELAY_MS = 1000;

/** Animation Config (Seconds) */
export const ANIMATION_RADAR_DURATION = 2.5;
export const ANIMATION_RADAR_DELAY_MULT = 0.8;
export const ANIMATION_LIST_DELAY_MULT = 0.1;
export const ANIMATION_SPLASH_DELAY_1 = 0.2;
export const ANIMATION_SPLASH_DELAY_2 = 0.3;
export const ANIMATION_SPLASH_DELAY_3 = 0.6;
export const ANIMATION_SPLASH_DURATION = 0.6;
