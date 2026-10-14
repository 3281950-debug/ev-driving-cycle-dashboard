import { Zap } from 'lucide-react';
import type { EVState, SimulationStatus } from '@/types/ev';
import { EnergyFlow } from './EnergyFlow';
import { Metric } from './Metric';
import { format } from '@/utils/format';

export function MotorPanel({ state: s, status, busy }: { state: EVState; status: SimulationStatus; busy: boolean }) {
  return <section className={`ev-card motor-panel ${s.motorPower < 0 ? 'recovering' : ''}`}><div className="ev-card-heading"><h2><Zap size={17} />电机系统</h2><span className="ev-tag">FWD · BEV</span></div>
    <div className="power-readout"><span>电机功率</span><strong>{format(s.motorPower)}<small>kW</small></strong><div className="power-track"><div style={{ width: `${Math.min(100, Math.abs(s.motorPower) / 150 * 100)}%` }} /></div></div>
    <div className="ev-metric-grid">
      <Metric label="电机转速" value={format(s.motorRpm, 0)} unit="RPM" />
      <Metric label="电机扭矩" value={format(s.motorTorque)} unit="N·m" />
      <Metric label="电机效率" value={format(s.motorEfficiency)} unit="%" />
      <Metric label="能量回收功率" value={format(s.regenPower)} unit="kW" accent />
      <Metric label="瞬时能耗" value={s.regenPower < -.1 ? '能量回收' : format(s.instantConsumption)} unit={s.regenPower < -.1 ? '' : 'kWh/100km'} />
      <Metric label="平均能耗" value={format(s.averageConsumption)} unit="kWh/100km" />
    </div><EnergyFlow state={s} status={status} busy={busy} />
  </section>;
}
