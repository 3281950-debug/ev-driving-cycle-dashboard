import { cycleDescriptions } from '@/localization/zhCN';
import { formatTime } from '@/utils/time';
import { Play, Pause, RotateCcw, SlidersHorizontal, ChevronsRight } from 'lucide-react';
import { cycles } from '@/drivingCycles';
import type { CycleId, EVPanelProps, SimulationSpeed } from '@/types/ev';

export function DrivingCycleSelector({ cycleId, setCycle }: Pick<EVPanelProps, 'cycleId' | 'setCycle'>) {
  return <div className="cycle-selector"><label htmlFor="driving-cycle">行驶工况</label><select id="driving-cycle" value={cycleId} onChange={e => setCycle(e.target.value as CycleId)}>{Object.keys(cycles).map(id => <option key={id}>{id}</option>)}</select><span>{cycleDescriptions[cycleId]}</span><small>近似演示工况 · 切换工况重新计时，保留电池状态</small></div>;
}
export function SimulationControls(p: EVPanelProps) {
  return <section className="ev-controls ev-card"><div className="transport"><button className="ev-primary" onClick={p.start} disabled={p.busy || p.status === 'RUNNING' || p.status === 'COMPLETED'}><Play size={15} />开始</button><button onClick={p.pause} disabled={p.status !== 'RUNNING'}><Pause size={15} />暂停</button><button onClick={p.reset}><RotateCcw size={15} />重置</button><button className="complete-button" onClick={() => void p.complete()} disabled={p.busy || p.status === 'COMPLETED'}><ChevronsRight size={15} />{p.busy ? '计算中…' : '一键完成'}</button></div>
    <div className="simulation-speed"><span>仿真倍速</span><div role="group" aria-label="仿真倍速">{([.5, 1, 2, 4, 8, 16, 64] as SimulationSpeed[]).map(speed => <button key={speed} aria-pressed={p.simulationSpeed === speed} onClick={() => p.setSimulationSpeed(speed)}>{speed}×</button>)}</div></div>
    <button className="engineering-toggle" aria-pressed={p.engineeringMode} onClick={p.toggleEngineeringMode}><SlidersHorizontal size={15} />工程模式<span>{p.engineeringMode ? '开' : '关'}</span></button>
  </section>;
}

export function SimulationTimelineControl(p: EVPanelProps) {
  return <section className="simulation-timeline" aria-busy={p.busy}>
    <div><label htmlFor="simulation-timeline">仿真时间轴</label><output htmlFor="simulation-timeline">{formatTime(p.state.time)} / {formatTime(p.duration)} <span>{(p.state.time / p.duration * 100).toFixed(0)}%</span></output></div>
    <input id="simulation-timeline" aria-label="仿真时间轴" type="range" min={0} max={p.duration} step={.05} value={p.state.time}
      onPointerDown={p.pause} onKeyDown={p.pause} onChange={e => void p.seek(Number(e.target.value))} />
    <small role="status">{p.busy ? `正在计算 ${formatTime(p.targetTime ?? p.state.time)}，仪表保持上一个已确认时刻…` : '拖动定位 · 定位后暂停，可继续播放'}{p.error && <span role="alert">{p.error}</span>}</small>
  </section>;
}
