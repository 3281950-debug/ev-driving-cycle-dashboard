import type { EVPanelProps } from '@/types/ev';
import { formatTime } from '@/utils/time';

/** Stable cycle-local result interface, ready for a later comparison feature. */
export function CompletionSummary(p: EVPanelProps) {
  const result = p.result;
  if (!result) return null;
  const restart = () => { const id = p.cycleId; p.reset(); p.setCycle(id); p.start(); };
  return <section className="completion-summary" aria-label="工况仿真完成">
    <div className="completion-heading"><h2>工况仿真完成 <span>{result.cycleId}</span></h2><button onClick={restart}>重新开始</button></div>
    <dl><div><dt>总仿真时长</dt><dd>{formatTime(result.duration)}</dd></div><div><dt>本工况行驶里程</dt><dd>{result.distance.toFixed(2)} <small>km</small></dd></div><div><dt>终点 SOC</dt><dd>{result.soc.toFixed(3)} <small>%</small></dd></div><div><dt>累计净能耗</dt><dd>{result.energyUsed.toFixed(3)} <small>kWh</small></dd></div><div><dt>平均百公里能耗</dt><dd>{result.averageConsumption?.toFixed(2) ?? '—'} <small>kWh/100km</small></dd></div></dl>
    <p>结果为本工况净能耗（已扣除回收）。拖动时间轴可回看；回看不会改变终点摘要。</p>
  </section>;
}
