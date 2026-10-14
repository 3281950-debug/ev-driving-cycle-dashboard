import type { EVState, SimulationStatus, TelemetrySample } from '@/types/ev';
import { simulationStatusText } from '@/localization/zhCN';

export const sessionLabel = (status: SimulationStatus, busy: boolean) => busy ? '计算中' : status === 'STOPPED' ? '待机' : simulationStatusText[status];
export function drivingFeedback(s: EVState) {
  if (s.speed < .1) return '停车';
  return s.acceleration > .05 ? '加速' : s.acceleration < -.05 ? '减速' : '稳定行驶';
}
export function energyFlow(s: EVState) {
  if (s.regenPower < -.1) return 'regen';
  if (s.motorPower > .1) return 'drive';
  return 'idle';
}
export function batteryFeedback(s: EVState) {
  return s.batteryPower < -.1 ? '回收充电' : s.batteryPower > 1 ? '正在放电' : '低功率 / 待机';
}
export function nearestSample(samples: TelemetrySample[], time: number): TelemetrySample | undefined {
  if (!samples.length) return undefined;
  let low = 0, high = samples.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (samples[mid].time < time) low = mid + 1; else high = mid;
  }
  const previous = samples[Math.max(0, low - 1)], next = samples[low];
  return Math.abs(previous.time - time) <= Math.abs(next.time - time) ? previous : next;
}
