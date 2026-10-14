import type { CycleId, SimulationStatus, EVState } from '@/types/ev';

// Display-only translations; simulation identifiers and cycle data stay unchanged.
export const simulationStatusText: Record<SimulationStatus, string> = {
  STOPPED: '已停止', RUNNING: '运行中', PAUSED: '已暂停', COMPLETED: '已完成',
};
export const gearText: Record<EVState['gear'], string> = { P: '驻车', D: '前进' };
export const drivingModeText: Record<string, string> = {
  idle: '怠速', city: '城市', highway: '高速', track: '赛道',
  ECO: '经济', NORMAL: '标准', SPORT: '运动',
};
export const cycleDescriptions: Record<CycleId, string> = {
  CLTC: '城市平缓过渡 · 频繁停车', NEDC: '规律加减速 · 节奏平缓',
  WLTP: '低速、中速与高速混合', 'FTP-75': '城市走走停停 · 节奏多变',
  US06: '急加速 · 高功率需求', JC08: '低速行驶 · 频繁短暂停车',
};
