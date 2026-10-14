import { describe, it, expect } from 'vitest';
import { initialEVState, computeEVStep, appendHistory } from './simulationEngine';
import { cycles, validateSamples, speedAt } from '../drivingCycles';

describe('EV physics and cycles', () => {
  it('integrates battery power into energy without artificial SOC drain', () => {
    let state = initialEVState();
    let integral = 0;
    for (let i = 0; i < 12000; i++) {
      state = computeEVStep(state, cycles.CLTC, .05);
      integral += state.batteryPower * .05 / 3600;
      expect(state.batteryCurrent * state.batteryVoltage / 1000).toBeCloseTo(state.batteryPower, 8);
      expect(state.motorTorque * state.motorRpm * Math.PI / 30000).toBeCloseTo(state.motorPower, 8);
    }
    expect(48.384 - state.batteryEnergy).toBeCloseTo(integral, 8);
    expect(state.soc).toBeLessThan(80);
    expect(state.soc).toBeGreaterThan(75);
  });
  it('returns negative current and increases energy in meaningful deceleration', () => {
    const state = { ...initialEVState(), speed: 70 };
    const next = computeEVStep(state, { id: 'CLTC', description: '', samples: [{ time: 0, speed: 0 }, { time: 20, speed: 0 }] }, .05);
    expect(next.regenPower).toBeLessThan(0);
    expect(next.batteryCurrent).toBeLessThan(0);
    expect(next.batteryEnergy).toBeGreaterThan(state.batteryEnergy);
  });
  it('disables recovery at full battery and driving at empty battery', () => {
    const full = computeEVStep({ ...initialEVState(), speed: 70, soc: 100, batteryEnergy: 60.48 }, cycles.CLTC, .05);
    expect(full.regenPower).toBe(0);
    expect(full.soc).toBeLessThanOrEqual(100);
    const empty = computeEVStep({ ...initialEVState(), soc: 0, batteryEnergy: 0 }, cycles.US06, .05);
    expect(empty.motorPower).toBe(0);
    expect(empty.batteryPower).toBe(0);
    expect(empty.soc).toBe(0);
  });
  it('can recover kinetic energy while coasting with an empty battery', () => {
    const next = computeEVStep({ ...initialEVState(), speed: 50, soc: 0, batteryEnergy: 0 }, cycles.CLTC, .05);
    expect(next.batteryPower).toBeLessThan(0);
    expect(next.batteryEnergy).toBeGreaterThan(0);
  });
  it('limits traction before advancing speed when the battery cannot supply the step', () => {
    const next = computeEVStep({ ...initialEVState(), time: 10, speed: 30, batteryEnergy: 1e-7, soc: 1e-7 / 60.48 * 100 }, cycles.US06, .05);
    expect(next.motorPower).toBe(0);
    expect(next.acceleration).toBeLessThanOrEqual(0);
    expect(next.batteryPower).toBeCloseTo(.0072, 8);
    expect(next.batteryEnergy).toBe(0);
  });
  it('US06 requires higher speed, acceleration and power than CLTC', () => {
    const peaks = (id: 'CLTC' | 'US06') => {
      let state = initialEVState();
      const result = [0, 0, 0];
      for (let i = 0; i < 6000; i++) {
        state = computeEVStep(state, cycles[id], .05);
        result[0] = Math.max(result[0], state.speed);
        result[1] = Math.max(result[1], state.acceleration);
        result[2] = Math.max(result[2], state.motorPower);
      }
      return result;
    };
    const city = peaks('CLTC'), fast = peaks('US06');
    fast.forEach((v, i) => expect(v).toBeGreaterThan(city[i] * 1.3));
  });
  it('validates CSV-compatible samples and interpolates time', () => {
    expect(() => validateSamples([{ time: 0, speed: 0 }, { time: 0, speed: 10 }])).toThrow();
    expect(() => validateSamples([{ time: 0, speed: 0 }, { time: 1, speed: NaN }])).toThrow();
    expect(speedAt([{ time: 0, speed: 0 }, { time: 10, speed: 20 }], 5)).toBe(10);
    Object.values(cycles).forEach(cycle => expect(() => validateSamples(cycle.samples)).not.toThrow());
  });
  it('never grows its chart buffer during two hours of simulated running', () => {
    let state = initialEVState();
    let history: ReturnType<typeof appendHistory> = [];
    for (let i = 0; i < 144000; i++) {
      state = computeEVStep(state, cycles.US06, .05);
      if (i % 4 === 3) history = appendHistory(history, state);
      expect(history.length).toBeLessThanOrEqual(301);
    }
    expect(history.length).toBeGreaterThanOrEqual(299);
    expect(history[0].time).toBeGreaterThanOrEqual(state.time - 60.01);
    Object.values(state).forEach(value => { if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true); });
  });
});
