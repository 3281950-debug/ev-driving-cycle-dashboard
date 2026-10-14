import { memo, useEffect, useRef, useState, useId } from 'react';
import { nearestSample } from '@/utils/evPresentation';
import type { TelemetrySample } from '@/types/ev';

interface Series { key: 'speed' | 'motorPower' | 'batteryPower' | 'regenPower'; label: string; color: string }
const speedSeries: Series[] = [{ key: 'speed', label: '车速', color: '#c6dbec' }];
const powerSeries: Series[] = [
  { key: 'motorPower', label: '电机', color: '#c6dbec' },
  { key: 'batteryPower', label: '电池', color: '#e8bc7c' },
  { key: 'regenPower', label: '能量回收', color: '#70c9b0' },
];
export const TelemetryChart = memo(function TelemetryChart({ history, time, duration = null, series, title, unit, min, max }: {
  history: TelemetrySample[]; time: number; duration?: number | null; series: Series[]; title: string; unit: string; min: number; max: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ time: number; left: number } | null>(null);
  const tooltipId = useId();
  const hovered = hover ? nearestSample(history, hover.time) : undefined;
  useEffect(() => { if (!history.length) setHover(null); }, [history.length]);
  const latest = useRef({ history, time, duration, hoverTime: hovered?.time });
  latest.current = { history, time, duration, hoverTime: hovered?.time };
  const drawRef = useRef<() => void>(() => {});
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const draw = () => {
      const { history: data, time: now, duration: fullDuration, hoverTime } = latest.current;
      const width = el.clientWidth, height = el.clientHeight, dpr = window.devicePixelRatio || 1;
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const left = 42, top = 14, w = width - left - 16, h = height - top - 28;
      const xStart = fullDuration === null ? Math.max(0, now - 60) : 0, xEnd = fullDuration ?? now;
      const x = (t: number) => left + (t - xStart) / Math.max(.2, xEnd - xStart) * w;
      const y = (v: number) => top + (max - v) / (max - min) * h;
      if (min < 0) {
        ctx.fillStyle = 'rgba(142,203,182,.07)'; ctx.fillRect(left, y(0), w, top + h - y(0));
        ctx.fillStyle = 'rgba(220,229,233,.02)'; ctx.fillRect(left, top, w, y(0) - top);
      }
      ctx.font = '11px system-ui'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const value = min + (max - min) * i / 4;
        ctx.strokeStyle = '#29333c'; ctx.beginPath(); ctx.moveTo(left, y(value)); ctx.lineTo(left + w, y(value)); ctx.stroke();
        ctx.fillStyle = '#7f909e'; ctx.textAlign = 'right'; ctx.fillText(String(Math.round(value)), left - 8, y(value) + 4);
      }
      if (min < 0) { ctx.strokeStyle = '#8d9da7'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(left, y(0)); ctx.lineTo(left + w, y(0)); ctx.stroke(); }
      ctx.textAlign = 'center';
      for (let i = 0; i <= 4; i++) ctx.fillText(`${Math.round(xStart + (xEnd - xStart) * i / 4)}s`, left + w * i / 4, height - 6);
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, w, h); ctx.clip();
      series.forEach(s => {
        ctx.strokeStyle = s.color; ctx.lineWidth = 1.8; ctx.beginPath();
        data.forEach((p, i) => { if (i === 0) ctx.moveTo(x(p.time), y(p[s.key])); else ctx.lineTo(x(p.time), y(p[s.key])); });
        ctx.stroke();
      });
      ctx.strokeStyle = '#dce5e9'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x(now), top); ctx.lineTo(x(now), top + h); ctx.stroke(); ctx.setLineDash([]);
      const current = nearestSample(data, now);
      if (current) series.forEach(s => { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(x(current.time), y(current[s.key]), 3, 0, Math.PI * 2); ctx.fill(); });
      if (hoverTime !== undefined) {
        const selected = nearestSample(data, hoverTime);
        ctx.strokeStyle = '#a5afb7'; ctx.beginPath(); ctx.moveTo(x(hoverTime), top); ctx.lineTo(x(hoverTime), top + h); ctx.stroke();
        if (selected) series.forEach(s => { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(x(selected.time), y(selected[s.key]), 3.5, 0, Math.PI * 2); ctx.fill(); });
      }
      ctx.restore();
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    drawRef.current = schedule;
    const observer = new ResizeObserver(schedule); observer.observe(el); schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); drawRef.current = () => {}; };
  }, [series, min, max]);
  useEffect(() => { drawRef.current(); }, [history, time, duration, hovered?.time]);
  const last = nearestSample(history, time);
  return <section className="ev-card chart-card"><div className="ev-card-heading"><h2>{title}<small>{unit}</small></h2><span className="ev-tag">{duration === null ? '最近 60 s' : '完整工况 · 当前时间标记'}</span></div>
    <div className="chart-legend">{series.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.label}<strong>{last ? last[s.key].toFixed(1) : '0.0'}</strong></span>)}<span>当前 {time.toFixed(1)} s</span></div>
    <div className="chart-plot"><canvas ref={canvas} role="img" tabIndex={0} aria-describedby={hovered ? tooltipId : undefined} aria-label={`${title}，${duration === null ? '最近 60 s' : '完整工况'}的仿真数据，单位 ${unit}，当前时间 ${time.toFixed(1)} s；悬停或按左右键查看采样点`}
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left - 42) / Math.max(1, rect.width - 58)));
        const start = duration === null ? Math.max(0, time - 60) : 0;
        setHover({ time: start + fraction * ((duration ?? time) - start), left: Math.max(0, Math.min(rect.width - 196, event.clientX - rect.left + 12)) });
      }} onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}
      onFocus={() => setHover({ time, left: 42 })}
      onKeyDown={event => {
        if (event.key === 'Escape') { setHover(null); return; }
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !history.length) return;
        event.preventDefault();
        const index = Math.max(0, history.indexOf(nearestSample(history, hover?.time ?? time)!));
        const next = history[Math.min(history.length - 1, Math.max(0, index + (event.key === 'ArrowRight' ? 1 : -1)))];
        setHover({ time: next.time, left: 42 });
      }} />
      {!history.length && <span className="chart-empty">开始仿真后显示曲线</span>}
      {hovered && <div className="chart-tooltip" role="tooltip" id={tooltipId} style={{ left: hover?.left ?? 42 }}><strong>采样时间 {hovered.time.toFixed(1)} s</strong>{series.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.label}<b>{hovered[s.key].toFixed(1)} <small>{unit}</small></b></span>)}</div>}
    </div>
    <p className="ev-footnote">{title === '功率' ? '时间 / s · 功率 / kW · 电机：机械功率 · 电池 / 能量回收：电功率 · 负值表示回收' : '时间 / s · 车速 / km/h'}</p>
  </section>;
});
export function SpeedChart({ history, time, duration }: { history: TelemetrySample[]; time: number; duration?: number | null }) { return <TelemetryChart history={history} time={time} duration={duration} title="车速" unit="km/h" series={speedSeries} min={0} max={160} />; }
export function PowerChart({ history, time, duration }: { history: TelemetrySample[]; time: number; duration?: number | null }) { return <TelemetryChart history={history} time={time} duration={duration} title="功率" unit="kW" series={powerSeries} min={-80} max={180} />; }
