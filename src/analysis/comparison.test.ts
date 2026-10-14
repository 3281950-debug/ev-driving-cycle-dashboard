import { describe, expect, it } from 'vitest';
import { analyzeCycles, comparisonSummary, serializeResults } from './comparison';
import { SimulationTimeline } from '@/simulation/timeline';
import { initialEVState } from '@/simulation/simulationEngine';
import { cycles } from '@/drivingCycles';

describe('independent cycle comparison', () => {
  it('computes all real cycles with equal conditions and the exact dashboard endpoint', async () => {
    const results = await analyzeCycles(Object.keys(cycles) as (keyof typeof cycles)[]);
    expect(results).toHaveLength(6);
    for (const result of results) {
      const reference = new SimulationTimeline(cycles[result.cycleId], initialEVState());
      while (reference.calculateNext()) { /* dashboard calculation */ }
      expect(result.soc).toBe(reference.summary().soc);
      expect(result.energyUsed).toBe(reference.summary().energyUsed);
      expect(result.distance).toBe(reference.summary().distance);
      expect(result.initialSOC).toBe(80);
      expect(result.socUsed).toBeCloseTo(80 - result.soc, 12);
      expect(result.averageConsumption).toBeCloseTo(result.energyUsed / result.distance * 100, 10);
      expect(result.averageSpeed).toBeCloseTo(result.distance / result.duration * 3600, 10);
      expect(result.regenEnergy).toBeGreaterThan(0);
      expect(result.regenEnergy).toBeLessThan(60 * result.duration / 3600);
    }
    expect(await analyzeCycles(['CLTC'])).toEqual([results.find(r => r.cycleId === 'CLTC')]);
  });
  it('cancels computation without returning contaminated results', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(analyzeCycles(['CLTC'], undefined, controller.signal)).rejects.toThrow('cancelled');
  });
  it('derives rankings from data rather than names and exports matching units', async () => {
    const results = await analyzeCycles(['CLTC', 'US06']);
    const altered = [{ ...results[0], averageConsumption: 25 }, { ...results[1], averageConsumption: 10 }];
    const summary = comparisonSummary(altered);
    expect(summary.low?.cycleId).toBe('US06');
    expect(summary.high?.cycleId).toBe('CLTC');
    expect(summary.difference).toBe(15);
    expect(summary.relative).toBe(150);
    expect(comparisonSummary([results[0]]).ready).toBe(false);
    expect(comparisonSummary([{ ...results[0], averageConsumption: null }]).ready).toBe(false);
    const text = serializeResults(results, '\t');
    expect(text.split('\r\n')).toHaveLength(3);
    expect(text).toContain('SOC 消耗(百分点)');
    expect(text).toContain('累计回收能量(kWh)');
    expect(text).not.toMatch(/NaN|Infinity/);
  });
});
