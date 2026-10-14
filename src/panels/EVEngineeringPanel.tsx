import { gearText } from '@/localization/zhCN';
import { drivingFeedback, sessionLabel } from '@/utils/evPresentation';
import { formatTime } from '@/utils/time';
import { Gauge } from '@/components/Gauge/Gauge';
import { BatteryPanel } from '@/components/EV/BatteryPanel';
import { MotorPanel } from '@/components/EV/MotorPanel';
import { DrivingCycleSelector, SimulationControls, SimulationTimelineControl } from '@/components/EV/SimulationControls';
import { CompletionSummary } from '@/components/EV/CompletionSummary';
import { SpeedChart, PowerChart } from '@/components/EV/TelemetryChart';
import { EngineeringPanel } from '@/components/EV/EngineeringPanel';
import type { EVPanelProps } from '@/types/ev';
import './EVEngineeringPanel.css';

const speedFormat = (v: number) => Math.round(v).toString();
const gaugeColors = { plate: '#101416', majorTicks: '#51616d', minorTicks: '#33424d', numbers: '#9da7ae', title: '#90a2af', units: '#adb6bd', zones: [{ from: 0, to: 160, color: '#dce5e9' }] };

export function EVEngineeringPanel(p: EVPanelProps) {
  const s = p.state;
  return <main className="ev-dashboard">
    <header className="ev-header"><div><div className="ev-eyebrow">车辆动力学实验室 / V1</div><h1>新能源汽车工程仪表盘</h1><div className="ev-vehicle"><strong>BYD ATTO 3</strong><span>BEV</span><span>60.48 kWh</span><span>CLTC 460 km</span><span>FWD</span><span>0–100 · 7.3 s</span></div></div><div className="ev-session"><span className={`ev-status ${p.busy ? 'computing' : p.status.toLowerCase()}`}><i />{sessionLabel(p.status, p.busy)}</span><span className="session-cycle">工况 <strong>{p.cycleId}</strong></span><span className="session-time" data-testid="simulation-time">{formatTime(s.time)} <small>/ {formatTime(p.duration)}</small></span>{p.result && <small className="session-result">已完成 · {p.result.distance.toFixed(2)} km · {p.result.energyUsed.toFixed(3)} kWh</small>}</div></header>
    <DrivingCycleSelector cycleId={p.cycleId} setCycle={p.setCycle} />
    <div className="ev-cockpit"><BatteryPanel state={s} engineeringMode={p.engineeringMode} />
      <section className="ev-speed-panel ev-card"><div className="ev-card-heading"><h2>车速</h2><span className="ev-gear"><strong>{s.gear}</strong><span>{gearText[s.gear]}</span></span></div>
        <div className="ev-speed-gauge" role="img" aria-label={`车速 ${s.speed.toFixed(0)} km/h`}><Gauge value={s.speed} type="arc" animationSpeed={p.status === 'RUNNING' && !p.busy ? 50 : 0} minValue={0} maxValue={160} width={480} height={320} majorTicks={8} minorTicks={2} units="km/h" title="车速" valueFormat={speedFormat} colors={gaugeColors} /></div>
        <div className={`ev-drive-state ${s.regenPower < -.1 ? 'regen' : ''}`}><span>{p.status === 'STOPPED' ? '准备开始仿真 · 停车' : drivingFeedback(s)}</span><span className="regen-indicator">{s.regenPower < -.1 ? 'REGEN / 能量回收' : ''}</span></div>
        <div className="ev-speed-summary"><div><span>加速度</span><strong>{s.acceleration.toFixed(2)}<small>m/s²</small></strong></div><div><span>行驶里程</span><strong>{s.distance.toFixed(2)}<small>km</small></strong></div></div>
      </section><MotorPanel state={s} status={p.status} busy={p.busy} /></div>
    <div className="ev-charts"><SpeedChart key={`${p.cycleId}-speed`} history={p.history} time={s.time} duration={p.chartDuration} /><PowerChart key={`${p.cycleId}-power`} history={p.history} time={s.time} duration={p.chartDuration} /></div>
    <SimulationTimelineControl {...p} />
    <SimulationControls {...p} />
    <CompletionSummary {...p} />
    {p.engineeringMode && <EngineeringPanel state={s} />}
    <footer className="ev-footer"><span>近似工况 · 仿真数据</span><span>20 Hz 数据更新 · 固定步长动力学 · 后台标签页暂停仿真</span></footer>
  </main>;
}
