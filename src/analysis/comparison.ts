import { cycles } from '@/drivingCycles';
import { initialEVState } from '@/simulation/simulationEngine';
import { SimulationTimeline } from '@/simulation/timeline';
import type { CycleId, CycleResult } from '@/types/ev';

export const cycleIds = Object.keys(cycles) as CycleId[];
export interface AnalysisResult extends CycleResult {
  initialSOC: number; socUsed: number; averageSpeed: number; maxSpeed: number; regenEnergy: number;
}
export interface AnalysisProgress { cycleId: CycleId; completed: number; total: number; fraction: number }
const yieldTask = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Reuse the dashboard timeline unchanged. Each cycle owns its own exact initial state. */
export async function analyzeCycles(ids: CycleId[], progress?: (p: AnalysisProgress) => void, signal?: AbortSignal): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  const unique = [...new Set(ids)];
  for (const id of unique) {
    const initial = initialEVState();
    const timeline = new SimulationTimeline(cycles[id], initial);
    let regenEnergy = 0, maxSpeed = 0;
    while (timeline.calculatedTime < timeline.duration) {
      if (signal?.aborted) throw new Error('Analysis cancelled');
      progress?.({ cycleId: id, completed: results.length, total: unique.length, fraction: (results.length + timeline.calculatedTime / timeline.duration) / unique.length });
      await yieldTask();
      const deadline = performance.now() + 8;
      do {
        if (signal?.aborted) throw new Error('Analysis cancelled');
        const before = timeline.calculatedTime;
        timeline.calculateNext();
        const state = timeline.stateAt(timeline.calculatedTime);
        regenEnergy += Math.max(0, -state.regenPower) * (state.time - before) / 3600;
        maxSpeed = Math.max(maxSpeed, state.speed);
      } while (timeline.calculatedTime < timeline.duration && performance.now() < deadline);
    }
    const result = timeline.summary();
    const row = { ...result, initialSOC: initial.soc, socUsed: initial.soc - result.soc,
      averageSpeed: result.duration > 0 ? result.distance * 3600 / result.duration : 0, maxSpeed, regenEnergy };
    if (Object.values(row).some(value => typeof value === 'number' && !Number.isFinite(value))) throw new Error('Invalid simulation statistics');
    results.push(row);
    progress?.({ cycleId: id, completed: results.length, total: unique.length, fraction: results.length / unique.length });
  }
  return results;
}

export function comparisonSummary(results: AnalysisResult[]) {
  const valid = results.filter(r => r.averageConsumption !== null && Number.isFinite(r.averageConsumption));
  const ranked = [...valid].sort((a, b) => a.averageConsumption! - b.averageConsumption!);
  const low = ranked[0], high = ranked[ranked.length - 1];
  const ready = valid.length >= 2;
  const difference = ready ? high.averageConsumption! - low.averageConsumption! : null;
  const relative = difference !== null && low.averageConsumption! > 1e-9 ? difference / low.averageConsumption! * 100 : null;
  return { ready, low, high, difference, relative,
    fastest: [...results].sort((a, b) => b.averageSpeed - a.averageSpeed)[0],
    recovered: [...results].sort((a, b) => b.regenEnergy - a.regenEnergy)[0],
    smallDifference: difference !== null && (difference < .1 || (relative !== null && relative < 2)) };
}

export const statisticColumns = [
  ['duration', '时长(s)', 0], ['distance', '里程(km)', 3], ['averageSpeed', '平均车速(km/h)', 2],
  ['maxSpeed', '最高车速(km/h)', 2], ['soc', '终点SOC(%)', 3], ['socUsed', 'SOC 消耗(百分点)', 3],
  ['energyUsed', '净电池能耗(kWh)', 3], ['averageConsumption', '平均能耗(kWh/100km)', 2], ['regenEnergy', '累计回收能量(kWh)', 3],
] as const;
export type StatisticKey = typeof statisticColumns[number][0];
export const displayValue = (value: number | null | undefined, digits = 2) => value !== null && value !== undefined && Number.isFinite(value) ? value.toFixed(digits) : '—';
export function serializeResults(results: AnalysisResult[], separator: '\t' | ','): string {
  const rows = [['工况', '初始SOC(%)', ...statisticColumns.map(column => column[1])],
    ...results.map(r => [r.cycleId, displayValue(r.initialSOC, 1), ...statisticColumns.map(([key, , precision]) => displayValue(r[key], precision))])];
  return rows.map(row => row.map(value => separator === ',' ? `"${value.replace(/"/g, '""')}"` : value).join(separator)).join('\r\n');
}
