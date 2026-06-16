import * as dgram from 'node:dgram';

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
  port = 5555,
  onDeviceFound?: (device: DiscoveredDevice) => void
): Promise<DiscoveredDevice[]> {
  return new Promise((resolve, reject) => {
    const devices: DiscoveredDevice[] = [];
    const client = dgram.createSocket('udp4');

    // How long to wait for all replies before closing the socket
    const TIMEOUT_MS = 2500;

    client.on('error', (err) => {
      client.close();
      reject(err);
    });

    client.on('message', (msg, rinfo) => {
      const message = msg.toString().trim();

      // Check if the reply matches our agreed format "PUMP_ID:<id>"
      if (message.startsWith('PUMP_ID:')) {
        const idString = message.split(':')[1];
        const deviceId = parseInt(idString, 10);

        if (!isNaN(deviceId)) {
          // Avoid duplicate entries
          if (!devices.find((d) => d.ip === rinfo.address)) {
            const device = { ip: rinfo.address, deviceId };
            devices.push(device);
            if (onDeviceFound) {
              onDeviceFound(device);
            }
          }
        }
      }
    });

    client.on('listening', () => {
      client.setBroadcast(true);

      const message = Buffer.from('DISCOVER_PUMP_REQUEST');

      // Fire 3 times for reliability (UDP is fire-and-forget)
      let broadcastsSent = 0;
      const interval = setInterval(() => {
        client.send(message, 0, message.length, port, '255.255.255.255', (err) => {
          if (err) console.error('[Scanner] Broadcast error:', err);
        });

        broadcastsSent++;
        if (broadcastsSent >= 3) {
          clearInterval(interval);
        }
      }, 300); // 300ms between each blast
    });

    // Start listening on an ephemeral port so we can receive the replies
    client.bind();

    // Close the socket and resolve after the timeout
    setTimeout(() => {
      client.close();
      resolve(devices);
    }, TIMEOUT_MS);
  });
}
