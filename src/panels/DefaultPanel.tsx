import { drivingModeText } from '@/localization/zhCN';
import {
  Car,
  Bluetooth,
  Wifi,
  Battery,
  Thermometer,
  Gauge as GaugeIcon,
  Fuel,
} from 'lucide-react';
import { RPMGauge, SpeedGauge, TemperatureGauge, LinearGauge } from '@/components/Gauge/Gauge';
import type { PanelProps } from './types';

/**
 * "default" theme.
 *
 * The classic multi-gauge OBD-II dashboard, refactored from the monolithic
 * component into a pure presentational view driven by the shared
 * `PanelProps` contract (see useDashboardData).
 */
export function DefaultPanel({
  metrics,
  isMockMode,
  connectionStatus,
  connectedDevice,
  error,
  selectedPIDs,
  togglePID,
  toggleMode,
}: PanelProps) {
  // Connection status display helpers
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'initializing': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return `已连接：${connectedDevice?.name || 'OBD 设备'}`;
      case 'connecting': return '连接中…';
      case 'scanning': return '正在扫描设备…';
      case 'initializing': return '正在初始化 ELM327…';
      case 'error': return error || '连接错误';
      default: return '未连接';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Car className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold">OBD-II 车辆仪表盘</h1>
              <p className="text-gray-400">实时车辆数据监测</p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
              <span className="text-sm font-medium">{getConnectionStatusText()}</span>
            </div>

            {/* Mode Toggle */}
            <button
              onClick={toggleMode}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isMockMode
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isMockMode ? (
                <span className="flex items-center gap-2">
                  <Bluetooth className="w-4 h-4" />
                  连接蓝牙 OBD-II
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  切换至模拟模式
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mode Indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isMockMode ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'
          }`}>
            {isMockMode ? `模拟模式：${drivingModeText[metrics.drivingMode ?? ""] ?? "未知"}` : '蓝牙实时模式'}
          </div>
          {isMockMode && metrics.gear && (
            <div className="px-3 py-1 bg-gray-800 rounded-full text-sm font-medium">
              挡位：{metrics.gear}
            </div>
          )}
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* RPM Gauge */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GaugeIcon className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-semibold">发动机转速</h2>
            </div>
            <span className="text-2xl font-bold text-red-400">{metrics.rpm}</span>
          </div>
          <RPMGauge value={metrics.rpm} width={300} height={200} />
        </div>

        {/* Speed Gauge */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold">车速</h2>
            </div>
            <span className="text-2xl font-bold text-blue-400">{metrics.speed} km/h</span>
          </div>
          <SpeedGauge value={metrics.speed} width={300} height={200} />
        </div>

        {/* Temperature Gauge */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-semibold">冷却液温度</h2>
            </div>
            <span className="text-2xl font-bold text-orange-400">{metrics.coolantTemp}°C</span>
          </div>
          <TemperatureGauge value={metrics.coolantTemp} width={300} height={200} />
        </div>

        {/* 发动机负载 */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">发动机负载</h2>
            <span className="text-2xl font-bold text-green-400">{metrics.engineLoad}%</span>
          </div>
          <LinearGauge
            value={metrics.engineLoad}
            minValue={0}
            maxValue={100}
            units="%"
            title="发动机负载"
            width={300}
            height={150}
            colors={{
              zones: [
                { from: 0, to: 50, color: '#00ff00' },
                { from: 50, to: 80, color: '#ffff00' },
                { from: 80, to: 100, color: '#ff0000' },
              ],
            }}
          />
        </div>

        {/* 节气门开度 */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">节气门开度</h2>
            <span className="text-2xl font-bold text-purple-400">{metrics.throttlePos}%</span>
          </div>
          <LinearGauge
            value={metrics.throttlePos}
            minValue={0}
            maxValue={100}
            units="%"
            title="节气门"
            width={300}
            height={150}
            colors={{
              zones: [
                { from: 0, to: 30, color: '#00ff00' },
                { from: 30, to: 70, color: '#ffff00' },
                { from: 70, to: 100, color: '#ff0000' },
              ],
            }}
          />
        </div>

        {/* 燃油余量 */}
        <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-semibold">燃油余量</h2>
            </div>
            <span className="text-2xl font-bold text-yellow-400">{metrics.fuelLevel}%</span>
          </div>
          <LinearGauge
            value={metrics.fuelLevel}
            minValue={0}
            maxValue={100}
            units="%"
            title="燃油"
            width={300}
            height={150}
            colors={{
              zones: [
                { from: 0, to: 20, color: '#ff0000' },
                { from: 20, to: 50, color: '#ffff00' },
                { from: 50, to: 100, color: '#00ff00' },
              ],
            }}
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Battery className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">电压</span>
          </div>
          <div className="text-2xl font-bold">{metrics.voltage?.toFixed(1) || '13.8'}V</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-400">进气温度</span>
          </div>
          <div className="text-2xl font-bold">{metrics.intakeTemp || '25'}°C</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <GaugeIcon className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-gray-400">MAF</span>
          </div>
          <div className="text-2xl font-bold">{metrics.maf?.toFixed(1) || '12.5'} g/s</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <GaugeIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-gray-400">点火提前角</span>
          </div>
          <div className="text-2xl font-bold">{metrics.timingAdvance?.toFixed(1) || '12.0'}°</div>
        </div>
      </div>

      {/* PID Selection Panel */}
      <div className="bg-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">选择要监测的 PID</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                checked ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => togglePID(pid)}
                className="sr-only"
              />
              <span className="font-medium">{label}</span>
              <span className="text-sm text-gray-300">({pid})</span>
            </label>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-500 text-sm">
        <p>
          {isMockMode
            ? '当前使用模拟数据。连接 ELM327 蓝牙 OBD-II 适配器可获取实时车辆数据。'
            : '已通过蓝牙接口连接实时车辆数据。'
          }
        </p>
        <p className="mt-2">
          支持桌面版谷歌浏览器或微软浏览器。需要 HTTPS 或本机访问。
        </p>
      </footer>
    </div>
  );
}