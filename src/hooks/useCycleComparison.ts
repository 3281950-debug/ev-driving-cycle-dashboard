import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeCycles, cycleIds } from '@/analysis/comparison';
import type { AnalysisProgress, AnalysisResult } from '@/analysis/comparison';
import type { CycleId } from '@/types/ev';

export function useCycleComparison() {
  const [selected, setSelected] = useState<CycleId[]>(['CLTC', 'US06', 'NEDC']);
  const [results, setResults] = useState<Partial<Record<CycleId, AnalysisResult>>>({});
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('尚未分析 · 所有工况采用统一初始条件');
  const job = useRef<AbortController | null>(null);
  useEffect(() => { const cancellation = job; return () => cancellation.current?.abort(); }, []);
  const run = useCallback(async (ids: CycleId[]) => {
    if (job.current || !ids.length) return;
    const controller = new AbortController(); job.current = controller;
    setBusy(true); setProgress(null); setMessage('正在独立计算各工况…');
    try {
      const rows = await analyzeCycles(ids, setProgress, controller.signal);
      if (controller.signal.aborted) return;
      setResults(previous => ({ ...previous, ...Object.fromEntries(rows.map(r => [r.cycleId, r])) }));
      setMessage(ids.length === cycleIds.length ? '六工况分析完成' : `${rows.length} 个工况分析完成`);
    } catch {
      if (!controller.signal.aborted) setMessage('分析失败，请重试。未覆盖上次有效结果。');
    } finally {
      if (job.current === controller) { job.current = null; setBusy(false); }
    }
  }, []);
  const analyzeAll = useCallback(() => { if (!job.current) { setSelected(cycleIds); void run(cycleIds); } }, [run]);
  const analyzeSelected = useCallback(() => { void run(selected); }, [run, selected]);
  const toggle = useCallback((id: CycleId) => setSelected(previous => previous.includes(id) ? previous.filter(v => v !== id) : [...previous, id]), []);
  const selectAll = useCallback(() => setSelected(cycleIds), []);
  const clearSelection = useCallback(() => setSelected([]), []);
  const clearResults = useCallback(() => {
    job.current?.abort(); job.current = null;
    setResults({}); setProgress(null); setBusy(false); setMessage('分析结果已清除，可重新计算');
  }, []);
  return { selected, results, progress, busy, message, analyzeAll, analyzeSelected, toggle, selectAll, clearSelection, clearResults };
}
