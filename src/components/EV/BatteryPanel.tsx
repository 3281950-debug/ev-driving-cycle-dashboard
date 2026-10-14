import { Battery } from 'lucide-react';
import type { EVState } from '@/types/ev';
import { Metric } from './Metric';
import { format } from '@/utils/format';
import { batteryFeedback } from '@/utils/evPresentation';

export function BatteryPanel({ state: s, engineeringMode = false }: { state: EVState; engineeringMode?: boolean }) {
  const soc = s.soc.toFixed(engineeringMode ? 3 : 1);
  return <section className="ev-card battery-panel"><div className="ev-card-heading"><h2><Battery size={17} />电池系统</h2><span className="ev-tag">60.48 kWh</span></div>
    <div className="soc-readout"><strong data-testid="soc">{soc.split('.')[0]}<span className="soc-precision">.{soc.split('.')[1]}</span><small>%</small></strong><span>SOC · 电池荷电状态</span></div>
    <div className="soc-track" role="meter" aria-label="电池荷电状态" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.soc}><div style={{ width: `${s.soc}%` }} /></div>
    <div className={`battery-status ${s.batteryPower < -.1 ? 'charging' : ''}`}><i className={s.batteryPower < -.1 ? 'charging' : ''} />{batteryFeedback(s)}</div>
    <div className="ev-metric-grid">
      <Metric label="电池剩余能量" value={format(s.batteryEnergy, 3)} unit="kWh" />
      <Metric label="预计续航" value={format(s.estimatedRange, 0)} unit="km" priority />
      <Metric label="电池电压" value={format(s.batteryVoltage)} unit="V" />
      <Metric label="电池电流" value={format(s.batteryCurrent)} unit="A" />
      <Metric label="电池功率" value={format(s.batteryPower)} unit="kW" accent />
      <Metric label="电池温度" value={format(s.batteryTemperature)} unit="°C" />
    </div><p className="ev-footnote">预计续航：SOC × 460 km · 演示车辆</p>
  </section>;
}
