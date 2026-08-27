import { create } from 'zustand';

export interface PumpLocalState {
  elapsedPhaseTime: number; // in deciseconds (0.1s)
  currentPhase: 'dispense' | 'pause';
  currentCycle: number;
  totalCycles: number;
  lastUpdated: number;
  runTimeTarget: number;
  pauseTimeTarget: number;
  isPlaying: boolean;
}

interface PumpStore {
  pumpStates: Record<string, PumpLocalState>;
  setPumpState: (ip: string, update: Partial<PumpLocalState>) => void;
  syncPumpData: (
    ip: string,
    isPlaying: boolean,
    totalCycles: number,
    runTime: number,
    pauseTime: number
  ) => void;
  clearPumpState: (ip: string) => void;
}

export const usePumpStore = create<PumpStore>((set) => ({
  pumpStates: {},
  setPumpState: (ip, update) =>
    set((state) => ({
      pumpStates: {
        ...state.pumpStates,
        [ip]: { ...state.pumpStates[ip], ...update },
      },
    })),
  clearPumpState: (ip) =>
    set((state) => {
      if (!(ip in state.pumpStates)) return state;
      const pumpStates = { ...state.pumpStates };
      delete pumpStates[ip];
      return { pumpStates };
    }),
  // Note: the S-series (base) pump has no live "cycles completed" register - Modbus
  // holding register 3111 is only the target we write once before starting (per the
  // LeadFluid Modbus spec, section 4.3), not a live counter. `totalCycles` is that
  // target, read back from the pump; it's used to clamp the local ticker below, not
  // to track live progress (there's no hardware signal for that on this series).
  syncPumpData: (ip, isPlaying, totalCycles, runTime, pauseTime) => {
    set((state) => {
      const existing = state.pumpStates[ip] || {
        elapsedPhaseTime: 0,
        currentPhase: 'dispense',
        currentCycle: 0,
        totalCycles,
        lastUpdated: Date.now(),
        runTimeTarget: runTime,
        pauseTimeTarget: pauseTime,
        isPlaying: isPlaying,
      };

      // If the pump is not running, reset timer
      if (!isPlaying) {
        return {
          pumpStates: {
            ...state.pumpStates,
            [ip]: {
              ...existing,
              elapsedPhaseTime: 0,
              currentPhase: 'dispense',
              currentCycle: existing.currentCycle, // Keep the cycle we reached, don't reset to 0 just because it stopped
              isPlaying,
              totalCycles,
              runTimeTarget: runTime,
              pauseTimeTarget: pauseTime,
              lastUpdated: Date.now(),
            },
          },
        };
      }

      // We don't overwrite currentCycle with hardware cycles for S-series because
      // S-series only has a target cycles register (no live completed-cycles readout).
      // We rely on our internal ticker to increment currentCycle.
      let nextCycle = existing.currentCycle;

      let nextElapsed = existing.elapsedPhaseTime;
      let nextPhase = existing.currentPhase;
      if (!existing.isPlaying && isPlaying) {
        nextElapsed = 0;
        nextPhase = 'dispense';
        nextCycle = 0;
      }

      // Clamp against the pump's own configured target so a timing drift between our
      // local ticker and the pump's firmware can never display more completed cycles
      // than the pump was ever told to run.
      if (totalCycles > 0 && nextCycle > totalCycles) {
        nextCycle = totalCycles;
      }

      return {
        pumpStates: {
          ...state.pumpStates,
          [ip]: {
            ...existing,
            currentCycle: nextCycle,
            totalCycles,
            isPlaying,
            runTimeTarget: runTime,
            pauseTimeTarget: pauseTime,
            elapsedPhaseTime: nextElapsed,
            currentPhase: nextPhase,
            lastUpdated: Date.now(),
          },
        },
      };
    });
  },
}));

// Ticker to run in the background and update timers for all running pumps
setInterval(() => {
  const { pumpStates, setPumpState } = usePumpStore.getState();
  const now = Date.now();

  Object.entries(pumpStates).forEach(([ip, state]) => {
    if (!state.isPlaying) return; // Only tick running pumps

    // Every 100ms interval = 1 decisecond.
    // We add 1 decisecond to elapsedPhaseTime
    let nextElapsed = state.elapsedPhaseTime + 1;
    let nextPhase = state.currentPhase;
    let nextCycle = state.currentCycle;

    if (state.currentPhase === 'dispense') {
      if (nextElapsed >= state.runTimeTarget && state.runTimeTarget > 0) {
        nextElapsed = 0;
        nextCycle += 1;
        if (state.pauseTimeTarget > 0) {
          nextPhase = 'pause';
        } else {
          nextPhase = 'dispense';
        }
      }
    } else if (state.currentPhase === 'pause') {
      if (nextElapsed >= state.pauseTimeTarget && state.pauseTimeTarget > 0) {
        nextElapsed = 0;
        nextPhase = 'dispense';
      }
    }

    // Same clamp as syncPumpData: never tick past the pump's own configured target.
    if (state.totalCycles > 0 && nextCycle > state.totalCycles) {
      nextCycle = state.totalCycles;
    }

    setPumpState(ip, {
      elapsedPhaseTime: nextElapsed,
      currentPhase: nextPhase,
      currentCycle: nextCycle,
      lastUpdated: now,
    });
  });
}, 100);
