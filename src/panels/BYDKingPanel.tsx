import { drivingModeText } from '@/localization/zhCN';
import {
  Bluetooth,
  Wifi,
  Thermometer,
  Fuel,
  Zap,
  Leaf,
  Activity,
  Gauge as GaugeIcon,
} from 'lucide-react';
import { RPMGauge, LinearGauge } from '@/components/Gauge/Gauge';
import type { PanelProps } from './types';

/**
 * "byd-king" theme — the BYD King main panel.
 *
 * An automotive cockpit-styled dashboard in BYD's brand colors (deep slate +
 * teal/cyan accents). It reuses the shared telemetry contract (PanelProps) so
 * it stays interchangeable with the default theme.
 */
export function BYDKingPanel({
  metrics,
  isMockMode,
  connectionStatus,
  connectedDevice,
  error,
  selectedPIDs,
  togglePID,
  toggleMode,
}: PanelProps) {
  const statusColor =
    connectionStatus === 'connected'
      ? 'bg-emerald-400'
      : connectionStatus === 'connecting' || connectionStatus === 'initializing'
        ? 'bg-amber-400'
        : connectionStatus === 'error'
          ? 'bg-rose-500'
          : 'bg-slate-500';

  const statusText =
    connectionStatus === 'connected'
      ? `实时 · ${connectedDevice?.name || 'OBD 设备'}`
      : connectionStatus === 'connecting'
        ? '连接中…'
        : connectionStatus === 'scanning'
          ? '扫描中…'
          : connectionStatus === 'initializing'
            ? '正在初始化 ELM327…'
            : connectionStatus === 'error'
              ? error || '连接错误'
              : '未连接';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative max-w-6xl mx-auto p-4 md:p-8">
        {/* Header bar */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Leaf className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">BYD KING</h1>
                <span className="text-cyan-300 font-semibold text-xs uppercase tracking-widest">主面板</span>
              </div>
              <p className="text-sm text-slate-400">成就梦想 · 实时 OBD 数据</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800">
              <span className={`w-2.5 h-2.5 rounded-full ${statusColor} animate-pulse`} />
              <span className="text-sm font-medium">{statusText}</span>
            </div>

            <button
              onClick={toggleMode}
              className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                isMockMode
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isMockMode ? (
                <>
                  <Wifi className="w-4 h-4" />
                  切换至实时模式
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4" />
                  模拟模式
                </>
              )}
            </button>
          </div>
        </header>

        {/* HUD badge */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isMockMode
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}>
            {isMockMode ? `模拟中 · ${drivingModeText[metrics.drivingMode ?? ""] ?? "未知"}` : '实时 · 蓝牙连接'}
          </div>
          {isMockMode && metrics.gear != null && (
            <div className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 border border-slate-800 text-cyan-300">
              挡位 {metrics.gear}
            </div>
          )}
        </div>

        {/* Primary cockpit row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Speed readout */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center backdrop-blur">
            <span className="text-xs uppercase tracking-widest text-slate-500 mb-1">车速</span>
            <div className="flex items-baseline gap-1">
              <span className="text-7xl font-black text-cyan-300 tabular-nums">{metrics.speed}</span>
              <span className="text-lg text-slate-400 font-medium">km/h</span>
            </div>
            <div className="mt-4 w-full">
              <LinearGauge
                value={metrics.speed}
                minValue={0}
                maxValue={240}
                units="km/h"
                title=""
                width={280}
                height={70}
                colors={{ zones: [
                  { from: 0, to: 80, color: '#2dd4bf' },
                  { from: 80, to: 120, color: '#fbbf24' },
                  { from: 120, to: 240, color: '#fb7185' },
                ] }}
              />
            </div>
          </div>

          {/* RPM gauge */}
          <div className="md:col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-slate-200">发动机转速</span>
              </div>
              <span className="text-2xl font-bold text-cyan-300 tabular-nums">{metrics.rpm} RPM</span>
            </div>
            <div className="flex justify-center scale-90 md:scale-100">
              <RPMGauge value={metrics.rpm} width={340} height={190} />
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-400">冷却液</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{metrics.coolantTemp}°C</div>
          </div>

          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">发动机负载</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{metrics.engineLoad}%</div>
          </div>

          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              <GaugeIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400">节气门</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{metrics.throttlePos}%</div>
          </div>

          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">燃油</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{metrics.fuelLevel}%</div>
          </div>
        </div>

        {/* PID selector */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 backdrop-blur">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            数据监测通道
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              { pid: '010C', label: 'RPM', checked: selectedPIDs.includes('010C') },
              { pid: '010D', label: '车速', checked: selectedPIDs.includes('010D') },
              { pid: '0104', label: '发动机负载', checked: selectedPIDs.includes('0104') },
              { pid: '0105', label: '冷却液温度', checked: selectedPIDs.includes('0105') },
              { pid: '0111', label: '节气门开度', checked: selectedPIDs.includes('0111') },
              { pid: '012F', label: '燃油余量', checked: selectedPIDs.includes('012F') },
            ].map(({ pid, label, checked }) => (
              <label
                key={pid}
                className={`flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer transition-colors border ${
                  checked
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePID(pid)}
                  className="sr-only"
                />
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs opacity-70">{pid}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <span>
            {isMockMode
              ? '当前使用模拟数据，连接 ELM327 蓝牙 OBD-II 适配器可获取实时数据。'
              : '通过蓝牙接口接收实时车辆数据。'}
          </span>
          <span className="flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-cyan-500" /> BYD King 主面板 · 成就梦想
          </span>
        </footer>
      </div>
    </div>
  );
}