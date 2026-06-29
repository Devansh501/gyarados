#if defined(ESP8266)
  #include <ESP8266WiFi.h>
#else
  #include <WiFi.h>
#endif

#include <WiFiUdp.h>
#include <ModbusIP_ESP8266.h> 

// --- WiFi Credentials ---
const char* ssid = "Microlit";
const char* password = "Microlit@629";

// --- Network & Ports ---
const int MODBUS_PORT = 5020;
const int UDP_PORT = 5555;

#include "Registers.h"

// --- Instances ---
ModbusIP mb;
WiFiUDP udp;
char incomingPacket[255]; 

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\nStarting Mock Peristaltic Pump...");

  // 1. Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi ");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // 2. Start UDP Server
  udp.begin(UDP_PORT);
  Serial.printf("[Pump UDP] Listening for discovery broadcasts on port %d\n", UDP_PORT);

  // 3. Start Modbus TCP Server
  mb.server(MODBUS_PORT);
  
  // 4. Setup Modbus Registers
  setupModbusRegisters(mb);

  Serial.printf("Pump is running and ready to accept Modbus TCP connections on port %d\n", MODBUS_PORT);
}

void loop() {
  // --- Modbus Task ---
  // This handles all incoming Modbus TCP traffic automatically
  mb.task();

  // --- UDP Broadcast Task ---
  // Check if a UDP packet has been received
  int packetSize = udp.parsePacket();
  if (packetSize) {
    // Read the packet into our buffer
    int len = udp.read(incomingPacket, 255);
    if (len > 0) {
      incomingPacket[len] = 0; // Null-terminate the string
    }
    
    // Convert to String and clean up whitespace/newlines
    String message = String(incomingPacket);
    message.trim();
    
    Serial.printf("[Pump UDP] Received broadcast: \"%s\" from %s:%d\n", 
                  message.c_str(), 
                  udp.remoteIP().toString().c_str(), 
                  udp.remotePort());

    // If it's the discovery request, send the reply
    if (message == "DISCOVER_PUMP_REQUEST") {
      const char* reply = "PUMP_ID:8000";
      
      udp.beginPacket(udp.remoteIP(), udp.remotePort());
      udp.write((const uint8_t*)reply, strlen(reply));
      udp.endPacket();
      
      Serial.printf("[Pump UDP] Sent reply \"PUMP_ID:8000\" back to %s:%d\n", 
                    udp.remoteIP().toString().c_str(), 
                    udp.remotePort());
    }
  }
}