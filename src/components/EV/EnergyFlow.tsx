import type { EVState, SimulationStatus } from '@/types/ev';
import { energyFlow } from '@/utils/evPresentation';

export function EnergyFlow({ state, status, busy }: { state: EVState; status: SimulationStatus; busy: boolean }) {
  const mode = energyFlow(state);
  const active = status === 'RUNNING' && !busy && mode !== 'idle';
  const returning = mode === 'regen';
  const batteryReturning = returning && state.batteryPower < -.1;
  const description = mode === 'drive' ? '电池 → 电机 → 车轮 · 驱动' : returning ? batteryReturning ? '车轮 → 电机 → 电池 · 能量回收' : '车轮 → 电机 · 回收供辅助负载' : '低功率 / 待机';
  return <div className={`energy-flow ${mode} ${active ? 'flow-running' : ''}`} data-mode={mode} data-running={active}>
    <svg viewBox="0 0 300 44" role="img" aria-label={description}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="6" width="28" height="18" rx="2"/><path d="M36 11h3v8h-3M15 10v10M21 10v10M27 10v10"/>
        <circle cx="150" cy="15" r="12"/><path d="M144 20V10l6 7 6-7v10"/>
        <circle cx="277" cy="15" r="12"/><circle cx="277" cy="15" r="4"/><path d="M277 3v8m0 8v8m-12-12h8m8 0h8"/>
        <path className={`flow-line ${batteryReturning ? 'reverse' : ''}`} d="M47 15h80"/>
        <path className={`flow-line ${returning ? 'reverse' : ''}`} d="M174 15h80"/>
        {mode !== 'idle' && <><path d={batteryReturning ? 'M57 10l-6 5 6 5' : 'M117 10l6 5-6 5'}/><path d={returning ? 'M184 10l-6 5 6 5' : 'M244 10l6 5-6 5'}/></>}
      </g>
      <g fill="currentColor" fontSize="10" textAnchor="middle"><text x="23" y="42">动力电池</text><text x="150" y="42">驱动电机</text><text x="277" y="42">车轮</text></g>
    </svg>
    <span>{description}</span>
  </div>;
}
