import { useEffect, useId, useRef, useState } from 'react';
import type { AnalysisResult, StatisticKey } from '@/analysis/comparison';
import { displayValue } from '@/analysis/comparison';

/** Same lightweight Canvas approach as the dashboard, without per-point animations. */
export function ComparisonChart({ rows, metric, title, unit, color }: {
  rows: AnalysisResult[]; metric: StatisticKey; title: string; unit: string; color: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const tooltipId = useId();
  const selected = hover === null ? undefined : rows[hover];
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    let frame = 0;
    const draw = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (width < 80 || height < 80) return;
      const ratio = window.devicePixelRatio || 1;
      element.width = width * ratio; element.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const left = 44, top = 20, w = width - left - 16, h = height - top - 30;
      const values = rows.map(r => r[metric]).filter((n): n is number => n !== null && Number.isFinite(n));
      const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values);
      const range = maximum - minimum || 1;
      const y = (value: number) => top + (maximum - value) / range * h;
      context.font = '11px "Microsoft YaHei", system-ui';
      context.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const value = minimum + range * i / 4;
        context.strokeStyle = '#30383e'; context.beginPath(); context.moveTo(left, y(value)); context.lineTo(left + w, y(value)); context.stroke();
        context.fillStyle = '#a5afb7'; context.textAlign = 'right'; context.fillText(value.toFixed(maximum < 2 ? 2 : 1), left - 8, y(value) + 4);
      }
      rows.forEach((row, index) => {
        const value = row[metric];
        const slot = w / Math.max(1, rows.length), barWidth = Math.min(52, slot * .55), x = left + slot * (index + .5);
        context.textAlign = 'center'; context.fillStyle = '#a5afb7'; context.fillText(row.cycleId, x, height - 8);
        if (value === null || !Number.isFinite(value)) return;
        context.globalAlpha = hover === null || hover === index ? 1 : .55;
        context.fillStyle = color; context.fillRect(x - barWidth / 2, Math.min(y(value), y(0)), barWidth, Math.max(1, Math.abs(y(value) - y(0))));
        context.globalAlpha = 1; context.fillStyle = '#eef2f4'; context.fillText(displayValue(value, 2), x, Math.max(12, y(value) - 7));
      });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    const observer = new ResizeObserver(schedule); observer.observe(element); schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [rows, metric, color, hover]);
  return <section className="comparison-chart"><div className="analysis-section-heading"><h2>{title}</h2><span>{unit}</span></div>
    <div className="chart-plot"><canvas ref={canvas} role="img" tabIndex={0} aria-label={`${title}，单位 ${unit}；左右键查看工况数值`} aria-describedby={selected ? tooltipId : undefined}
      onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); const fraction = (event.clientX - rect.left - 44) / (rect.width - 60); setHover(fraction >= 0 && fraction <= 1 && rows.length ? Math.min(rows.length - 1, Math.floor(fraction * rows.length)) : null); }}
      onPointerLeave={() => setHover(null)} onFocus={() => setHover(rows.length ? 0 : null)} onBlur={() => setHover(null)}
      onKeyDown={event => { if (event.key === 'Escape') setHover(null); else if (['ArrowLeft', 'ArrowRight'].includes(event.key) && rows.length) { event.preventDefault(); setHover(previous => Math.max(0, Math.min(rows.length - 1, (previous ?? 0) + (event.key === 'ArrowRight' ? 1 : -1)))); } }} />
      {!rows.length && <p className="analysis-chart-empty">暂无分析结果</p>}
      {selected && <div className="chart-tooltip comparison-tooltip" role="tooltip" id={tooltipId}><strong>{selected.cycleId}</strong><span>{title}</span><b>{displayValue(selected[metric], 3)} <small>{unit}</small></b></div>}
    </div>
  </section>;
}
