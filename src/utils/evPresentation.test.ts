import { describe, expect, it } from 'vitest';
import { initialEVState } from '@/simulation/simulationEngine';
import { drivingFeedback, energyFlow, batteryFeedback, sessionLabel, nearestSample } from './evPresentation';

describe('data-derived visual feedback', () => {
  const base = initialEVState();
  it('distinguishes acceleration, cruise, deceleration and parking', () => {
    expect(drivingFeedback({ ...base, speed: 40, acceleration: 1 })).toBe('加速');
    expect(drivingFeedback({ ...base, speed: 40, acceleration: 0 })).toBe('稳定行驶');
    expect(drivingFeedback({ ...base, speed: 40, acceleration: -1 })).toBe('减速');
    expect(drivingFeedback(base)).toBe('停车');
  });
  it('does not claim battery charging when weak regeneration only supplies accessories', () => {
    const weak = { ...base, speed: 3, motorPower: -.2, regenPower: -.15, batteryPower: .55 };
    expect(energyFlow(weak)).toBe('regen');
    expect(batteryFeedback(weak)).toBe('低功率 / 待机');
    expect(batteryFeedback({ ...weak, batteryPower: -10 })).toBe('回收充电');
    expect(energyFlow({ ...base, motorPower: 30, batteryPower: 34 })).toBe('drive');
    expect(energyFlow(base)).toBe('idle');
  });
  it('shows computation separately from paused status', () => {
    expect(sessionLabel('PAUSED', true)).toBe('计算中');
    expect(sessionLabel('STOPPED', false)).toBe('待机');
  });
  it('chooses real nearest samples without synthesizing tooltip values', () => {
    const samples = [0, 1, 2].map(time => ({ time, speed: time * 10, motorPower: 0, batteryPower: 0, regenPower: 0 }));
    expect(nearestSample(samples, .9)).toBe(samples[1]);
    expect(nearestSample(samples, 3)).toBe(samples[2]);
    expect(nearestSample([], 1)).toBeUndefined();
  });
});
