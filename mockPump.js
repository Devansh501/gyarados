import ModbusRTU from "modbus-serial";
import dgram from "node:dgram";

const vector = {
  getInputRegister: function(addr, unitID) { return addr; },
  getHoldingRegister: function(addr, unitID) {
    console.log(`[Pump] Read request for Register ${addr}`);
    // Register 0: Device ID (e.g., 9000)
    if (addr === 0) {
      return 9000; 
    }
    // Register 123: Cycles pending
    if (addr === 123) {
      return 1; // Return 1 cycle pending
    }
    return 0;
  },
  getCoil: function(addr, unitID) { return (addr % 2) === 0; },
  setRegister: function(addr, value, unitID) {
    console.log(`[Pump] Set Register ${addr} to ${value}`);
    return;
  },
  setCoil: function(addr, value, unitID) {
    console.log(`[Pump] Set Coil ${addr} to ${value}`);
    return;
  }
};

// Set the IP and Port
const port = 5020;
const ip = "0.0.0.0"; // Listen on all interfaces

console.log(`Starting mock Peristaltic Pump Modbus TCP server on port ${port}...`);
console.log(`Note: This is just a simulation script for UI development without the physical hardware.`);

const serverTCP = new ModbusRTU.ServerTCP(vector, { host: ip, port: port, debug: true, unitID: 1 });

serverTCP.on("socketError", function(err){
    console.error("[Pump] Socket Error:", err);
});

console.log("Pump is running and ready to accept Modbus TCP connections.");

// --- UDP BROADCAST LISTENER ---
const udpPort = 5555;
const serverUDP = dgram.createSocket('udp4');

serverUDP.on('error', (err) => {
  console.log(`[Pump UDP] Server error:\n${err.stack}`);
  serverUDP.close();
});

serverUDP.on('message', (msg, rinfo) => {
  const message = msg.toString().trim();
  console.log(`[Pump UDP] Received broadcast: "${message}" from ${rinfo.address}:${rinfo.port}`);

  if (message === 'DISCOVER_PUMP_REQUEST') {
    const reply = Buffer.from('PUMP_ID:9000');
    serverUDP.send(reply, rinfo.port, rinfo.address, (err) => {
      if (err) {
        console.error('[Pump UDP] Failed to send reply', err);
      } else {
        console.log(`[Pump UDP] Sent reply "PUMP_ID:9000" back to ${rinfo.address}:${rinfo.port}`);
      }
    });
  }
});

serverUDP.on('listening', () => {
  const address = serverUDP.address();
  console.log(`[Pump UDP] Listening for discovery broadcasts on port ${address.port}`);
});

serverUDP.bind(udpPort);
