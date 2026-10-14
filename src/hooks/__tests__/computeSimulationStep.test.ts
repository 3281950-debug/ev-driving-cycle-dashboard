import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeSimulationStep, DEFAULT_CONFIG, generateMockOBDData } from '../useOBDSimulator';
import { OBDMetrics } from '@/types/obd';

/**
 * Helper: build a full SimulatorMetrics-compatible object.
 * SimulatorMetrics extends OBDMetrics with `gear` and `drivingMode`.
 */
function makeState(overrides: Partial<{
  rpm: number; speed: number; engineLoad: number; coolantTemp: number;
  throttlePos: number; fuelLevel: number; intakeTemp: number; maf: number;
  timingAdvance: number; voltage: number; gear: number;
  drivingMode: 'idle' | 'city' | 'highway' | 'track';
}> = {}) {
  const drivingMode = overrides.drivingMode ?? 'city';
  return {
    rpm: overrides.rpm ?? 800,
    speed: overrides.speed ?? 0,
    engineLoad: overrides.engineLoad ?? 15,
    coolantTemp: overrides.coolantTemp ?? 40,
    throttlePos: overrides.throttlePos ?? 0,
    fuelLevel: overrides.fuelLevel ?? 85,
    intakeTemp: overrides.intakeTemp ?? 25,
    maf: overrides.maf ?? 12.5,
    timingAdvance: overrides.timingAdvance ?? 12,
    voltage: overrides.voltage ?? 13.8,
    gear: overrides.gear ?? 1,
    drivingMode,
  };
}

describe('computeSimulationStep', () => {
  const time = 1_000_000;

  beforeEach(() => {
    // Deterministic randomness for reproducible assertions
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an object with all OBDMetrics fields plus gear and drivingMode', () => {
    const current = makeState();
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);

    expect(next).toHaveProperty('rpm');
    expect(next).toHaveProperty('speed');
    expect(next).toHaveProperty('engineLoad');
    expect(next).toHaveProperty('coolantTemp');
    expect(next).toHaveProperty('throttlePos');
    expect(next).toHaveProperty('fuelLevel');
    expect(next).toHaveProperty('intakeTemp');
    expect(next).toHaveProperty('maf');
    expect(next).toHaveProperty('timingAdvance');
    expect(next).toHaveProperty('voltage');
    expect(next).toHaveProperty('gear');
    expect(next).toHaveProperty('drivingMode');
  });

  it('never lets RPM drop below the 750 idle floor', () => {
    const current = makeState({ rpm: 760, gear: 1, throttlePos: 5 });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    expect(next.rpm).toBeGreaterThanOrEqual(750);
  });

  it('keeps RPM >= 750 even when starting at the floor', () => {
    const current = makeState({ rpm: 750, gear: 1, throttlePos: 5 });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    expect(next.rpm).toBeGreaterThanOrEqual(750);
  });

  it('upsifts gear when RPM exceeds 4500', () => {
    const current = makeState({ rpm: 4600, gear: 1 });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    expect(next.gear).toBe(2);
  });

  it('downshifts gear when RPM drops below 1500 and gear > 1', () => {
    const current = makeState({ rpm: 1400, gear: 3 });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    expect(next.gear).toBe(2);
  });

  it('does not upshift beyond the number of gear ratios', () => {
    const current = makeState({ rpm: 6000, gear: 6 });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    expect(next.gear).toBe(6);
  });

  it('does not downshift below gear 1', () => {
    const current = makeState({ rpm: 800, gear: 1 });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    expect(next.gear).toBe(1);
  });

  it('calculates speed from RPM and gear ratio', () => {
    const current = makeState({ rpm: 3000, gear: 3 });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    // Speed = (RPM * gearRatio) / 120 — verify the relationship holds
    const expectedSpeed = (next.rpm * DEFAULT_CONFIG.gearRatios[2]) / 120;
    expect(next.speed).toBeCloseTo(expectedSpeed, 5);
  });

  it('clamps throttle to a plausible range', () => {
    const current = makeState({ drivingMode: 'city' });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    expect(next.throttlePos).toBeGreaterThanOrEqual(5);
    expect(next.throttlePos).toBeLessThanOrEqual(100);
  });

  it('clamps fuel level to [0, 100] over many steps', () => {
    let current: ReturnType<typeof computeSimulationStep> = makeState({ fuelLevel: 80, rpm: 4000 });
    for (let i = 0; i < 200; i++) {
      current = computeSimulationStep(current, time + i * 50, DEFAULT_CONFIG);
    }
    expect(current.fuelLevel).toBeGreaterThanOrEqual(0);
    expect(current.fuelLevel).toBeLessThanOrEqual(100);
  });

  it('does not drain fuel to zero over an extended simulation', () => {
    let current: ReturnType<typeof computeSimulationStep> = makeState({ fuelLevel: 50, rpm: 2000 });
    for (let i = 0; i < 500; i++) {
      current = computeSimulationStep(current, time + i * 50, DEFAULT_CONFIG);
    }
    expect(current.fuelLevel).toBeGreaterThan(0);
  });
  it('does not empty a legacy fuel tank in ten seconds of high load', () => {
    let current: ReturnType<typeof computeSimulationStep> = makeState({ fuelLevel: 85, rpm: 4500, drivingMode: 'track' });
    for (let i = 0; i < 200; i++) current = computeSimulationStep(current, 8000 + i * 50, DEFAULT_CONFIG);
    expect(current.fuelLevel).toBeGreaterThan(80);
  });

  it('warms up coolant temperature towards the max', () => {
    let current: ReturnType<typeof computeSimulationStep> = makeState({ coolantTemp: 40, rpm: 3000 });
    for (let i = 0; i < 300; i++) {
      current = computeSimulationStep(current, time + i * 50, DEFAULT_CONFIG);
    }
    expect(current.coolantTemp).toBeGreaterThan(40);
    expect(current.coolantTemp).toBeLessThanOrEqual(105);
  });

  it('preserves drivingMode across steps', () => {
    const current = makeState({ drivingMode: 'highway' });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    expect(next.drivingMode).toBe('highway');
  });

  it('interpolates RPM smoothly toward the target (no teleport)', () => {
    const current = makeState({ rpm: 800, gear: 1, throttlePos: 50 });
    const next = computeSimulationStep(current, time, DEFAULT_CONFIG);
    const delta = Math.abs(next.rpm - current.rpm);
    expect(delta).toBeLessThan(2000);
  });

  it('includes all OBDMetrics keys even with custom config', () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      gearRatios: [4.0, 2.5, 1.7, 1.3, 1.0],
    };
    const current = makeState({ rpm: 2500, gear: 2 });
    const next = computeSimulationStep(current, time, customConfig);
    const expectedKeys: (keyof OBDMetrics)[] = [
      'rpm', 'speed', 'engineLoad', 'coolantTemp', 'throttlePos',
      'fuelLevel', 'intakeTemp', 'maf', 'timingAdvance', 'voltage',
    ];
    expectedKeys.forEach(key => {
      expect(next).toHaveProperty(key);
      expect(typeof next[key]).toBe('number');
    });
  });
});

describe('generateMockOBDData', () => {
  it('returns an object with all OBDMetrics fields', () => {
    const data = generateMockOBDData();
    expect(data).toHaveProperty('rpm');
    expect(data).toHaveProperty('speed');
    expect(data).toHaveProperty('engineLoad');
    expect(data).toHaveProperty('coolantTemp');
    expect(data).toHaveProperty('throttlePos');
    expect(data).toHaveProperty('fuelLevel');
    expect(data).toHaveProperty('intakeTemp');
    expect(data).toHaveProperty('maf');
    expect(data).toHaveProperty('timingAdvance');
    expect(data).toHaveProperty('voltage');
  });

  it('returns finite numeric values', () => {
    const data = generateMockOBDData();
    Object.values(data).forEach(value => {
      expect(value).not.toBeNaN();
      expect(Number.isFinite(value)).toBe(true);
    });
  });

  it('returns RPM within a plausible range', () => {
    const data = generateMockOBDData();
    expect(data.rpm).toBeGreaterThanOrEqual(-1200);
    expect(data.rpm).toBeLessThanOrEqual(2800);
  });

  it('returns fuelLevel between plausible bounds', () => {
    const data = generateMockOBDData();
    expect(data.fuelLevel).toBeGreaterThanOrEqual(55);
    expect(data.fuelLevel).toBeLessThanOrEqual(75);
  });
});
