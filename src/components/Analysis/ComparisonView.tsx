import { memo, useMemo, useState } from 'react';
import { Clipboard, Download, Play, RotateCcw } from 'lucide-react';
import { useCycleComparison } from '@/hooks/useCycleComparison';
import { comparisonSummary, cycleIds, displayValue, serializeResults, statisticColumns } from '@/analysis/comparison';
import type { StatisticKey } from '@/analysis/comparison';
import { ComparisonChart } from './ComparisonChart';
import './ComparisonView.css';

export const ComparisonView = memo(function ComparisonView(p: ReturnType<typeof useCycleComparison>) {
  const [sort, setSort] = useState<StatisticKey>('averageConsumption');
  const [descending, setDescending] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const selectedIds = useMemo(() => [...p.selected].sort((a, b) => {
    const first = p.results[a]?.[sort], second = p.results[b]?.[sort];
    if (first === undefined || first === null) return second === undefined || second === null ? 0 : 1;
    if (second === undefined || second === null) return -1;
    return (first - second) * (descending ? -1 : 1);
  }), [p.selected, p.results, sort, descending]);
  const rows = useMemo(() => selectedIds.flatMap(id => p.results[id] ? [p.results[id]!] : []), [selectedIds, p.results]);
  const summary = useMemo(() => comparisonSummary(rows), [rows]);
  const copy = async () => {
    const text = serializeResults(rows, '\t');
    try { await navigator.clipboard.writeText(text); setCopyFallback(null); setExportMessage(`已复制 ${rows.length} 个工况，可直接粘贴到 Excel`); }
    catch { setCopyFallback(text); setExportMessage('浏览器未允许自动复制，请选中下方文本手动复制。'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + serializeResults(rows, ',')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = '工况对比结果.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setExportMessage(`已导出 ${rows.length} 个工况的 CSV`);
  };
  return <main className="ev-dashboard comparison-view">
    <header className="analysis-header"><div className="ev-eyebrow">车辆动力学实验室 / 对比分析</div><h1>工况对比分析中心</h1><p>BYD ATTO 3 · 统一初始 SOC 80% · 电池 60.48 kWh · 原有车辆参数</p></header>
    <section className="analysis-controls" aria-label="工况选择与分析操作"><div className="analysis-toolbar"><div><button className="analysis-primary" onClick={p.analyzeAll} disabled={p.busy}><Play size={15}/>{p.busy ? '正在计算…' : '一键分析全部工况'}</button><button onClick={p.analyzeSelected} disabled={p.busy || !p.selected.length}>分析所选</button><button onClick={p.clearResults}><RotateCcw size={15}/>清除分析结果</button></div><span role="status">{p.message}</span></div>
      <div className="cycle-multiselect"><span>参与对比</span>{cycleIds.map(id => <label key={id}><input type="checkbox" checked={p.selected.includes(id)} onChange={() => p.toggle(id)} />{id}</label>)}<button onClick={p.selectAll}>全选</button><button onClick={p.clearSelection}>清空</button></div>
      {p.busy && <div className="analysis-progress"><progress max={1} value={p.progress?.fraction ?? 0}/><span>{p.progress ? `${p.progress.cycleId} · 已完成 ${p.progress.completed}/${p.progress.total} · ${(p.progress.fraction * 100).toFixed(0)}%` : '准备计算…'}</span></div>}
      <p className="analysis-note">分析与实时仪表盘独立，运行中的仿真继续推进。仅绘制、导出当前选择的已分析结果；未分析数据以“—”标注。{p.busy && ' 当前展示上一次有效结果。'}</p>
    </section>
    {!p.selected.length ? <section className="analysis-empty"><h2>尚未选择工况</h2><p>选择至少两个工况进行对比，或点击“一键分析全部工况”。清空选择不会删除已计算结果。</p></section> : <>
      <dl className="comparison-overview"><div><dt>已分析 / 已选择</dt><dd>{rows.length}<small> / {p.selected.length} 个工况</small></dd></div><div><dt>平均能耗最低</dt><dd>{summary.ready ? summary.low?.cycleId : '—'}<small>{summary.ready ? `${displayValue(summary.low?.averageConsumption)} kWh/100km` : '至少两个有效结果'}</small></dd></div><div><dt>平均能耗最高</dt><dd>{summary.ready ? summary.high?.cycleId : '—'}<small>{summary.ready ? `${displayValue(summary.high?.averageConsumption)} kWh/100km` : '至少两个有效结果'}</small></dd></div><div><dt>最高与最低差异</dt><dd>{displayValue(summary.difference)}<small>kWh/100km · {displayValue(summary.relative)}%</small></dd></div></dl>
      <div className="comparison-charts"><ComparisonChart rows={rows} metric="averageConsumption" title="平均百公里能耗对比" unit="kWh/100km" color="#c6dbec"/><ComparisonChart rows={rows} metric="socUsed" title="SOC 消耗对比" unit="百分点" color="#d4b58a"/><ComparisonChart rows={rows} metric="regenEnergy" title="累计回收能量" unit="kWh" color="#8ecbb6"/></div>
      <p className="analysis-note">SOC 下降和累计回收受工况时长、里程影响，不能直接作为能效排名。净电池能耗已扣除回收，回收能量为电回收功率积分，未扣除辅助负载。</p>
      <section className="comparison-table-section"><div className="analysis-section-heading"><h2>工况统计对比 <small>{rows.length}/{p.selected.length} 已分析</small></h2><div className="table-actions"><label>排序 <select aria-label="排序指标" value={sort} onChange={event => setSort(event.target.value as StatisticKey)}>{statisticColumns.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button onClick={() => setDescending(value => !value)}>{descending ? '降序' : '升序'}</button><button disabled={!rows.length || p.busy} onClick={() => void copy()}><Clipboard size={14}/>复制对比结果</button><button disabled={!rows.length || p.busy} onClick={download}><Download size={14}/>导出 CSV</button></div></div>
        <div className="comparison-table-scroll"><table><thead><tr><th>工况</th><th>状态</th>{statisticColumns.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>{selectedIds.map(id => {
          const result = p.results[id];
          return <tr key={id} aria-selected="true"><th scope="row"><span className="selected-cycle-dot"/>{id}</th><td>{result ? '已分析' : '未分析'}</td>{statisticColumns.map(([key, , precision]) => <td key={key} className={summary.ready && key === 'averageConsumption' ? id === summary.low?.cycleId ? 'value-low' : id === summary.high?.cycleId ? 'value-high' : '' : ''}>{displayValue(result?.[key], precision)}{summary.ready && key === 'averageConsumption' && id === summary.low?.cycleId && <small>低</small>}{summary.ready && key === 'averageConsumption' && id === summary.high?.cycleId && id !== summary.low?.cycleId && <small>高</small>}</td>)}</tr>;
        })}</tbody></table></div><p className="export-status" role="status">{exportMessage}</p>{copyFallback && <textarea className="copy-fallback" readOnly aria-label="手动复制对比结果" value={copyFallback} onFocus={event => event.currentTarget.select()}/>}
      </section>
      <section className="comparison-summary" aria-label="工况分析总结"><div className="analysis-section-heading"><h2>工况分析总结</h2><span>本地规则生成 · 基于当前选择</span></div>
        {!summary.ready ? <p>至少需要两个已分析且具有有效百公里能耗的工况，才能形成完整比较。当前有效结果不足。</p> : <>
          <p><strong>主要发现</strong> {summary.low!.cycleId} 的平均能耗最低，为 {displayValue(summary.low!.averageConsumption)} kWh/100km；{summary.high!.cycleId} 最高，为 {displayValue(summary.high!.averageConsumption)} kWh/100km。</p>
          <p><strong>指标差异</strong> 绝对差异 {displayValue(summary.difference)} kWh/100km{summary.relative === null ? '，相对差异因基准非正值不计算。' : `，以最低值为基准的相对差异为 ${displayValue(summary.relative)}%。`}{summary.smallDifference && ' 差异较小，不宜夸大。'}</p>
          <p><strong>工况特征</strong> 平均车速最高为 {summary.fastest!.cycleId}（{displayValue(summary.fastest!.averageSpeed)} km/h）；累计回收最多为 {summary.recovered!.cycleId}（{displayValue(summary.recovered!.regenEnergy, 3)} kWh）。各工况 SOC 下降量见表格，单位为百分点。</p>
          <p><strong>综合总结</strong> 在统一车辆参数与初始 SOC 下，百公里能耗可用于观察单位里程消耗差异。速度及回收数据可结合观察，但本结果不能证明单一因素的因果关系。</p>
        </>}
        <p className="analysis-model-note"><strong>模型提示</strong> 原有工况为近似演示轨迹，时长和里程不同；车辆参数及效率、热模型为仿真假设。结果仅用于当前模型下的工程演示，不等同于法规测试或实车结论。</p>
      </section>
    </>}
  </main>;
});
