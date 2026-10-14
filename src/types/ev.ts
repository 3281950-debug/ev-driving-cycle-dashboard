export type CycleId = 'CLTC' | 'NEDC' | 'WLTP' | 'FTP-75' | 'US06' | 'JC08';
export type SimulationStatus = 'STOPPED' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type SimulationSpeed = .5 | 1 | 2 | 4 | 8 | 16 | 64;
export interface CycleResult {
  cycleId: CycleId; duration: number; distance: number; soc: number;
  energyUsed: number; averageConsumption: number | null;
}
export interface CycleSample { time: number; speed: number }
export interface DrivingCycle { id: CycleId; description: string; samples: CycleSample[] }
export interface EVState {
  time: number; cycleTime: number; speed: number; acceleration: number;
  wheelRpm: number; motorRpm: number; motorTorque: number; motorPower: number;
  motorEfficiency: number; regenPower: number; batteryEnergy: number; soc: number;
  batteryVoltage: number; batteryCurrent: number; batteryPower: number;
  batteryTemperature: number; estimatedRange: number; distance: number;
  netEnergyUsed: number; instantConsumption: number | null; averageConsumption: number | null;
  aerodynamicPower: number; rollingPower: number; gear: 'P' | 'D';
}
export interface TelemetrySample {
  time: number; speed: number; motorPower: number; batteryPower: number; regenPower: number;
}
export interface EVPanelProps {
  state: EVState; history: TelemetrySample[]; cycleId: CycleId; status: SimulationStatus;
  simulationSpeed: SimulationSpeed; engineeringMode: boolean;
  duration: number; busy: boolean; targetTime: number | null; error: string | null;
  result: CycleResult | null; chartDuration: number | null;
  complete: () => Promise<void>; seek: (time: number) => Promise<void>;
  start: () => void; pause: () => void; reset: () => void;
  setCycle: (id: CycleId) => void; setSimulationSpeed: (speed: SimulationSpeed) => void;
  toggleEngineeringMode: () => void;
}
