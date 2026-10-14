import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { OBDMetrics } from '@/types/obd';

export interface SimulatorConfig {
  updateInterval: number; // ms between updates
  drivingMode: 'idle' | 'city' | 'highway' | 'track';
  maxRpm: number;
  gearRatios: number[];
  temperatureRange: { min: number; max: number };
}

export const DEFAULT_CONFIG: SimulatorConfig = {
  updateInterval: 50, // 20Hz for smooth animations
  drivingMode: 'city',
  maxRpm: 8000,
  gearRatios: [3.5, 2.0, 1.5, 1.2, 1.0, 0.8], // 6-speed transmission
  temperatureRange: { min: 40, max: 95 },
};

// Driving-mode parameters: realistic throttle / speed / rpm envelopes
const DRIVING_PARAMS: Record<SimulatorConfig['drivingMode'], {
  throttleRange: [number, number];
  speedRange: [number, number];
  rpmRange: [number, number];
}> = {
  idle:    { throttleRange: [5, 15],  speedRange: [0, 10],    rpmRange: [750, 1200] },
  city:    { throttleRange: [10, 60], speedRange: [0, 80],    rpmRange: [1000, 4000] },
  highway: { throttleRange: [20, 40], speedRange: [80, 120],  rpmRange: [2000, 3500] },
  track:   { throttleRange: [40, 100], speedRange: [60, 180],  rpmRange: [3000, 8000] },
};

const DRIVING_MODES: SimulatorConfig['drivingMode'][] = ['idle', 'city', 'highway', 'track'];

/** Extended metrics that include simulation-only fields not part of OBDMetrics. */
interface SimulatorMetrics extends OBDMetrics {
  gear: number;
  drivingMode: SimulatorConfig['drivingMode'];
}

const INITIAL_METRICS: Omit<SimulatorMetrics, 'drivingMode'> = {
  rpm: 800,
  speed: 0,
  engineLoad: 15,
  coolantTemp: 40,
  throttlePos: 0,
  fuelLevel: 85,
  intakeTemp: 25,
  maf: 12.5,
  timingAdvance: 12,
  voltage: 13.8,
  gear: 1,
};

/**
 * Pure simulation step — computes the next metrics state from the current one.
 *
 * Extracted from the hook so it can be unit-tested in isolation without
 * rendering a React component. The function is deterministic given a fixed
 * Math.random() mock.
 */
export function computeSimulationStep(
  current: SimulatorMetrics,
  time: number,
  config: SimulatorConfig
): SimulatorMetrics {
  // -- Throttle (simulates erratic driver input) ----------------------
  const baseThrottle = Math.sin(time / 5000) * 20 + 40;        // 20-60 base
  const throttleVariation = Math.sin(time / 1500) * 10;         // +/-10 wiggle
  const randomVariation = (Math.random() - 0.5) * 15;           // +/-7.5 noise
  const params = DRIVING_PARAMS[current.drivingMode];
  let throttle = baseThrottle + throttleVariation + randomVariation;
  throttle = Math.max(params.throttleRange[0], Math.min(params.throttleRange[1], throttle));

  // -- Gear shifting logic based on engine speed ---------------------
  let gear = current.gear;
  const rpm = current.rpm;
  if (rpm > 4500 && gear < config.gearRatios.length) {
    gear++;                          // Upshift
  } else if (rpm < 1500 && gear > 1) {
    gear--;                          // Downshift
  }

  // -- RPM (smooth linear interpolation for needle fluidity) ----------
  const gearPenalty = (gear - 1) * 200;
  const targetRpm = params.rpmRange[0] + (throttle * 60) - gearPenalty;
  let nextRpm = current.rpm + (targetRpm - current.rpm) * 0.15;
  if (nextRpm < 750) nextRpm = 750;  // Engine idle floor

  // -- Vehicle speed (relative to RPM and gear profile) ---------------
  const speed = (nextRpm * config.gearRatios[gear - 1]) / 120;

  // -- Coolant temperature (warms up, cools at idle) ----------------
  let temp = current.coolantTemp;
  if (temp < config.temperatureRange.max) {
    temp += nextRpm > 2000 ? 0.08 : 0.02;  // Fast warm under load, slow at idle
  } else if (nextRpm < 1500) {
    temp -= 0.03;                           // Cool down at idle
  }
  temp = Math.max(
    config.temperatureRange.min,
    Math.min(config.temperatureRange.max + 5, temp)
  );

  // -- Legacy fuel demo: time-scaled burn, no artificial refill at idle. ---
  let fuel = current.fuelLevel;
  const fuelBurnRate = (nextRpm * throttle) / 500000 * (config.updateInterval / 1000) / 60;
  fuel -= fuelBurnRate;
  fuel = Math.max(0, Math.min(100, fuel));

  // -- Secondary derived metrics --------------------------------------
  const intakeTemp = temp - 15 + (Math.sin(time / 8000) * 5);
  const maf = (nextRpm * throttle) / 6000;
  const engineLoad = throttle * 0.85;
  const timingAdvance = 10 + (nextRpm / 500) + (Math.sin(time / 3000) * 3);
  const voltage = 13.8 + (Math.sin(time / 4000) * 0.5) + (throttle > 50 ? -0.3 : 0);

    return {
    ...current,
    rpm: nextRpm,
    speed,
    engineLoad,
    coolantTemp: temp,
    throttlePos: throttle,
    fuelLevel: fuel,
    intakeTemp,
    maf,
    timingAdvance,
    voltage,
    gear,
    drivingMode: current.drivingMode,
  };
}

// Utility function to create realistic mock data for testing
export function generateMockOBDData(): OBDMetrics {
  const time = Date.now();

  return {
    rpm: 800 + Math.sin(time / 3000) * 2000,
    speed: 30 + Math.sin(time / 5000) * 40,
    engineLoad: 25 + Math.sin(time / 4000) * 30,
    coolantTemp: 75 + Math.sin(time / 8000) * 10,
    throttlePos: 30 + Math.sin(time / 3500) * 25,
    fuelLevel: 65 + Math.sin(time / 10000) * 10,
    intakeTemp: 40 + Math.sin(time / 7000) * 8,
    maf: 15 + Math.sin(time / 4500) * 8,
    timingAdvance: 12 + Math.sin(time / 6000) * 5,
    voltage: 13.5 + Math.sin(time / 9000) * 0.8,
  };
}

/**
 * Round raw simulation floats for display in React state.
 * The simulation engine keeps full float precision in refs; this helper
 * is applied only at the React boundary so that fractional increments
 * (e.g. +0.08° coolant per tick) accumulate correctly without being
 * rounded away on every cycle.
 */
function roundForDisplay(metrics: SimulatorMetrics): SimulatorMetrics {
  return {
    ...metrics,
    rpm: Math.round(metrics.rpm),
    speed: Math.round(metrics.speed),
    engineLoad: Math.round(metrics.engineLoad),
    coolantTemp: Math.round(metrics.coolantTemp),
    throttlePos: Math.round(metrics.throttlePos),
    fuelLevel: Math.round(metrics.fuelLevel),
    intakeTemp: Math.round(metrics.intakeTemp ?? 0),
    maf: parseFloat((metrics.maf ?? 0).toFixed(2)),
    timingAdvance: parseFloat((metrics.timingAdvance ?? 12).toFixed(1)),
    voltage: parseFloat((metrics.voltage ?? 13.8).toFixed(2)),
  };
}

/**
 * OBD-II simulator hook that mimics erratic car telemetry (idling, accelerating,
 * shifting gears, and cooling down) using a state-machine driven by a high-frequency
 * interval.
 *
 * Design notes
 * ------------
 * The 20 Hz interval owns every piece of mutable simulation state via **refs**
 * rather than React useState. The interval callback performs a single
 * setMetrics per tick (the *final* merged state), which:
 *   - eliminates the stale-closure / interval-churn cycle that occurs when
 *     setMetrics is called inside setInterval with metrics in the deps.
 *   - keeps the effective update rate at the true 20 Hz, giving smooth gauge
 *     needle animation.
 *
 * drivingMode is also kept in React state so a panel (e.g. DefaultPanel) can
 * display it, but it is read by the interval via the metrics ref.
 */
export function useOBDSimulator(
  isMocking: boolean,
  config: Partial<SimulatorConfig> = {}
): OBDMetrics & { gear: number; drivingMode: string } {
  const fullConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  const [metrics, setMetrics] = useState<SimulatorMetrics>(() => ({
    ...INITIAL_METRICS,
    drivingMode: fullConfig.drivingMode,
  }));

  // Refs let the high-frequency interval read the *latest* committed values
  // without re-creating the interval or triggering re-render storms.
  const metricsRef = useRef<SimulatorMetrics>(
    (() => ({ ...INITIAL_METRICS, drivingMode: fullConfig.drivingMode }))()
  );
  const configRef = useRef<SimulatorConfig>(fullConfig);

  // Keep config ref synchronized (metrics ref is updated directly by tick
  // so the simulation retains raw float precision for accumulation).
  useEffect(() => {
    configRef.current = fullConfig;
  }, [fullConfig]);

  // Single tick: read raw values from ref, compute next raw state via the
  // pure function, store raw in ref for the next cycle, and commit rounded
  // values to React state for display. Stable identity (empty deps) so the
  // interval effect below never re-creates the interval.
  const tick = useCallback(() => {
    const raw = computeSimulationStep(metricsRef.current, Date.now(), configRef.current);
    metricsRef.current = raw;
    setMetrics(roundForDisplay(raw));
  }, []);

  // 20 Hz simulation loop - set up once, torn down on unmount / toggle
  useEffect(() => {
    if (!isMocking) return;
    const interval = setInterval(tick, configRef.current.updateInterval);
    return () => clearInterval(interval);
  }, [isMocking, tick]);

  // Periodically cycle driving modes for variety (~30 s)
  useEffect(() => {
    if (!isMocking) return;
    const modeInterval = setInterval(() => {
      const currentMode = metricsRef.current.drivingMode;
      const currentIndex = DRIVING_MODES.indexOf(currentMode);
      const nextIndex = (currentIndex + 1) % DRIVING_MODES.length;
      const nextMode = DRIVING_MODES[nextIndex];
      // Update raw ref and rounded React state
      metricsRef.current = { ...metricsRef.current, drivingMode: nextMode };
      setMetrics(prev => ({ ...prev, drivingMode: nextMode }));
    }, 30000);
    return () => clearInterval(modeInterval);
  }, [isMocking]);

  return metrics;
}
