#ifndef REGISTERS_H
#define REGISTERS_H

#include <ModbusIP_ESP8266.h>
#include <Arduino.h>

// 1. Add new registers to this enum
enum PumpRegister {
  REG_DEVICE_ID = 0,
  REG_CYCLES_PENDING = 123,
  // REG_NEW_EXAMPLE = 10,
};

// Configuration struct for each register
struct RegisterConfig {
  PumpRegister address;
  uint16_t defaultValue;
};

// 2. Add the configuration (enum value and default value) to this array
const RegisterConfig PUMP_REGISTERS[] = {
  {REG_DEVICE_ID, 8000},
  {REG_CYCLES_PENDING, 1},
  // {REG_NEW_EXAMPLE, 255},
};

const int NUM_PUMP_REGISTERS = sizeof(PUMP_REGISTERS) / sizeof(PUMP_REGISTERS[0]);

// Helper Function to Setup Registers Automatically
inline void setupModbusRegisters(ModbusIP& mb) {
  for (int i = 0; i < NUM_PUMP_REGISTERS; i++) {
    uint16_t regAddr = PUMP_REGISTERS[i].address;
    uint16_t defaultVal = PUMP_REGISTERS[i].defaultValue;
    
    // Allocate memory for the register and set its default value
    mb.addHreg(regAddr, defaultVal);
    
    // Add a generic callback for logging and value retention
    mb.onSetHreg(regAddr, [](TRegister* reg, uint16_t val) -> uint16_t {
      // The callback guarantees that written values are properly stored and accessible via read.
      Serial.printf("[Pump] Register modified -> new value: %d\n", val);
      return val;
    });
  }
}

#endif // REGISTERS_H
