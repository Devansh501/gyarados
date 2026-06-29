import * as dgram from 'node:dgram';
import os from 'node:os';
import {
  UDP_DISCOVERY_PORT,
  WIFI_DISCOVERY_RETRIES,
  WIFI_DISCOVERY_RETRY_DELAY_MS,
  WIFI_SCAN_TIMEOUT_MS,
} from './constants/network';

export interface DiscoveredDevice {
  ip: string;
  deviceId: number;
}

/**
 * Scans the local network for Wi-Fi pumps using UDP Broadcast.
 * @param port The UDP port to broadcast on (default: 5555)
 * @param onDeviceFound Callback when a device replies to the broadcast
 */
export async function scanWifiDevices(
  port = UDP_DISCOVERY_PORT,
  onDeviceFound?: (device: DiscoveredDevice) => void
): Promise<DiscoveredDevice[]> {
  return new Promise((resolve, reject) => {
    const devices: DiscoveredDevice[] = [];
    const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const discoveryMessage = Buffer.from('DISCOVER_PUMP_REQUEST');
    const broadcastAddresses = getBroadcastAddresses();
    const discoveredDeviceIds = new Set<number>();
    const discoveredIps = new Set<string>();
    let settled = false;
    let retryTimer: NodeJS.Timeout | null = null;
    let scanTimer: NodeJS.Timeout | null = null;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;

      if (retryTimer) clearInterval(retryTimer);
      if (scanTimer) clearTimeout(scanTimer);

      client.removeAllListeners('message');
      client.removeAllListeners('error');
      try {
        client.close();
      } catch {
        // The socket may already be closed after an early bind/send error.
      }

      if (error) {
        reject(error);
      } else {
        resolve(devices);
      }
    };

    client.on('error', (err) => {
      finish(err);
    });

    client.on('message', (msg, rinfo) => {
      const message = msg.toString().trim();

      // Check if the reply matches our agreed format "PUMP_ID:<id>"
      if (message.startsWith('PUMP_ID:')) {
        const idString = message.split(':')[1];
        const deviceId = parseInt(idString, 10);

        if (!isNaN(deviceId)) {
          // A single pump can answer from multiple adapter IPs when running locally or on routed networks.
          if (!discoveredDeviceIds.has(deviceId) && !discoveredIps.has(rinfo.address)) {
            const device = { ip: rinfo.address, deviceId };
            devices.push(device);
            discoveredDeviceIds.add(deviceId);
            discoveredIps.add(rinfo.address);
            if (onDeviceFound) {
              onDeviceFound(device);
            }
          }
        }
      }
    });

    client.on('listening', () => {
      if (settled) return;

      client.setBroadcast(true);

      let broadcastsSent = 0;
      const broadcast = () => {
        for (const address of broadcastAddresses) {
          client.send(discoveryMessage, 0, discoveryMessage.length, port, address, (err) => {
            if (err) console.error(`[Scanner] Broadcast error to ${address}:`, err);
          });
        }
        broadcastsSent++;
        if (broadcastsSent >= WIFI_DISCOVERY_RETRIES && retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      };

      broadcast();
      if (broadcastsSent < WIFI_DISCOVERY_RETRIES) {
        retryTimer = setInterval(broadcast, WIFI_DISCOVERY_RETRY_DELAY_MS);
      }
    });

    // Start listening on an ephemeral port so we can receive the replies
    client.bind();

    // Close the socket and resolve after the timeout
    scanTimer = setTimeout(() => finish(), WIFI_SCAN_TIMEOUT_MS);
  });
}

function getBroadcastAddresses(): string[] {
  const addresses = new Set<string>(['255.255.255.255']);

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const details of interfaces ?? []) {
      if (details.family !== 'IPv4' || details.internal) continue;

      const broadcastAddress = calculateBroadcastAddress(details.address, details.netmask);
      if (broadcastAddress) addresses.add(broadcastAddress);
    }
  }

  return [...addresses];
}

function calculateBroadcastAddress(address: string, netmask: string): string | null {
  const ip = ipv4ToNumber(address);
  const mask = ipv4ToNumber(netmask);

  if (ip === null || mask === null) return null;

  return numberToIpv4((ip | (~mask >>> 0)) >>> 0);
}

function ipv4ToNumber(value: string): number | null {
  const octets = value.split('.').map((part) => Number.parseInt(part, 10));

  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return null;
  }

  return octets.reduce((acc, octet) => ((acc << 8) | octet) >>> 0, 0);
}

function numberToIpv4(value: number): string {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}
