import type { EVState } from '@/types/ev';
import { vehicle } from '@/simulation/vehicleConfig';
import { Metric } from './Metric';
import { format } from '@/utils/format';

export function EngineeringPanel({ state: s }: { state: EVState }) {
  return <section className="ev-card engineering-panel"><div className="ev-card-heading"><h2>工程模式数据</h2><span className="ev-tag">仿真假设参数</span></div><div className="engineering-grid">
    <Metric label="SOC 精确值" value={format(s.soc, 3)} unit="%" />
    <Metric label="加速度" value={format(s.acceleration, 2)} unit="m/s²" />
    <Metric label="车轮转速" value={format(s.wheelRpm, 0)} unit="RPM" />
    <Metric label="电机效率" value={format(s.motorEfficiency)} unit="%" />
    <Metric label="电池功率" value={format(s.batteryPower)} unit="kW" />
    <Metric label="空气阻力功率" value={format(s.aerodynamicPower, 2)} unit="kW" />
    <Metric label="滚动阻力功率" value={format(s.rollingPower, 2)} unit="kW" />
    <Metric label="累计净耗电量" value={format(s.netEnergyUsed, 3)} unit="kWh" />
    <Metric label="整车质量" value={String(vehicle.mass)} unit="kg" />
  </div><p className="ev-footnote">假设参数：风阻系数 0.29 · 迎风面积 2.5 m² · 滚阻系数 0.01 · 车轮半径 0.33 m · 主减速比 9.1 · 辅助负载 0.7 kW。采用简化效率与热模型。</p></section>;
}
