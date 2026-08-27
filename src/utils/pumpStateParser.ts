import { S_SERIES_HOLDING, F_SERIES_INPUT } from '../registers';

function getUInt32(registers: Record<number, number>, addr: number): number | undefined {
  const word1 = registers[addr];
  const word2 = registers[addr + 1];
  if (word1 !== undefined && word2 !== undefined) {
    // LeadFluid defaults to CDAB (word1=low, word2=high) but can be ABCD
    // For small numbers like cycles or steps, the high word is 0.
    if (word2 === 0) return word1; // CDAB
    if (word1 === 0) return word2; // ABCD
    return ((word2 << 16) | word1) >>> 0; // Default CDAB full 32-bit
  }
  return undefined;
}

export function parsePumpRegisters(pumpType: 'base' | 'clever' | 'intelligent' | string | undefined, registers: Record<number, number>, currentState: any) {
  const newState = { ...currentState, registers };

  if (pumpType === 'base') {
    if (registers[S_SERIES_HOLDING.RPM] !== undefined) newState.rpm = registers[S_SERIES_HOLDING.RPM] / 10;
    if (registers[S_SERIES_HOLDING.DIRECTION] !== undefined) newState.direction = registers[S_SERIES_HOLDING.DIRECTION] as 0 | 1;
    if (registers[S_SERIES_HOLDING.RUN_TIME] !== undefined) newState.runTime = registers[S_SERIES_HOLDING.RUN_TIME] / 10;
    if (registers[S_SERIES_HOLDING.PAUSE_TIME] !== undefined) newState.pauseTime = registers[S_SERIES_HOLDING.PAUSE_TIME] / 10;
    if (registers[S_SERIES_HOLDING.CYCLES] !== undefined) newState.cycles = registers[S_SERIES_HOLDING.CYCLES];
    if (registers[S_SERIES_HOLDING.RUN_STATE] !== undefined) newState.isPlaying = registers[S_SERIES_HOLDING.RUN_STATE] === 1;
  } else if (pumpType === 'clever' || pumpType === 'intelligent') {
    // Clever and Intelligent share similar base holding registers for control usually,
    // but they also have input registers.
    
    // For control parameters
    if (registers[S_SERIES_HOLDING.RPM] !== undefined) newState.rpm = registers[S_SERIES_HOLDING.RPM] / 10;
    if (registers[S_SERIES_HOLDING.DIRECTION] !== undefined) newState.direction = registers[S_SERIES_HOLDING.DIRECTION] as 0 | 1;
    if (registers[S_SERIES_HOLDING.RUN_STATE] !== undefined) newState.isPlaying = registers[S_SERIES_HOLDING.RUN_STATE] === 1;
    
    // For progress parameters
    const elapsed = getUInt32(registers, F_SERIES_INPUT.CURRENT_STEPS);
    if (elapsed !== undefined) newState.elapsedTime = elapsed;
    
    const req = getUInt32(registers, F_SERIES_INPUT.REQ_STEPS);
    if (req !== undefined) newState.runTime = req;
    
    const curCycles = getUInt32(registers, F_SERIES_INPUT.CURRENT_CYCLES);
    if (curCycles !== undefined) newState.currentCycle = curCycles;
    
    // Add more F_SERIES_INPUT mapping later as needed
  }

  return newState;
}
