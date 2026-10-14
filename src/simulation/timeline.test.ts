import { describe, expect, it } from 'vitest';
import { cycles } from '@/drivingCycles';
import { computeEVStep, initialEVState } from './simulationEngine';
import { SimulationTimeline } from './timeline';

describe('fixed-step cycle timeline', () => {
  it('matches every physical integration step and never wraps at the endpoint', () => {
    const timeline = new SimulationTimeline(cycles.CLTC, initialEVState());
    let reference = initialEVState();
    for (let i = 1; i <= 6000; i++) {
      reference = computeEVStep(reference, cycles.CLTC, .05);
      reference = { ...reference, time: i * .05, cycleTime: i * .05 };
      timeline.calculateNext();
    }
    expect(timeline.stateAt(300)).toEqual(reference);
    expect(timeline.calculateNext()).toBe(false);
    expect(timeline.samples[0].time).toBe(0);
    expect(timeline.samples[timeline.samples.length - 1].time).toBe(300);
    expect(timeline.samples.length).toBeLessThanOrEqual(1501);
  });
  it('replays cached SOC and energy without interpolation or recalculation', () => {
    const timeline = new SimulationTimeline(cycles.US06, initialEVState());
    while (timeline.calculateNext()) { /* finite full cycle */ }
    const middle = timeline.stateAt(150);
    expect(timeline.stateAt(150)).toBe(middle);
    expect(middle.batteryEnergy).toBeCloseTo(middle.soc / 100 * 60.48, 10);
    expect(middle.batteryEnergy + middle.netEnergyUsed).toBeCloseTo(48.384, 10);
    expect(timeline.stateAt(75).distance).toBeLessThan(middle.distance);
    expect(timeline.summary().duration).toBe(300);
    expect(timeline.summary().distance).toBe(timeline.stateAt(300).distance);
  });
});
