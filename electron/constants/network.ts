/** Standard Modbus TCP port (pump firmware). */
export const MODBUS_TCP_PORT = 502;

/** Mock pump port for local dev (Linux cannot bind port 502 without root). */
export const MODBUS_TCP_PORT_DEV = 5020;

/** UDP port the pump listens on for discovery broadcasts. */
export const UDP_DISCOVERY_PORT = 5555;

export const HEARTBEAT_INTERVAL_MS = 2000;
export const MODBUS_TIMEOUT_MS = 250;
export const MAX_POLL_FAILURES = 3;

export function getDefaultModbusPort(): number {
  return process.env.VITE_DEV_SERVER_URL ? MODBUS_TCP_PORT_DEV : MODBUS_TCP_PORT;
}
