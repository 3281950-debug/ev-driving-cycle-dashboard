import type { CycleResult, DrivingCycle, EVState, TelemetrySample } from '@/types/ev';
import { computeEVStep } from './simulationEngine';

export const PHYSICS_STEP = .05;
const sampleOf = (s: EVState): TelemetrySample => ({ time: s.time, speed: s.speed,
  motorPower: s.motorPower, batteryPower: s.batteryPower, regenPower: s.regenPower });

/** One finite cycle, exact fixed-step states; no React or interpolation. */
export class SimulationTimeline {
  readonly duration: number;
  readonly samples: TelemetrySample[];
  private states: EVState[];
  constructor(readonly cycle: DrivingCycle, readonly initial: EVState) {
    this.duration = cycle.samples[cycle.samples.length - 1].time;
    this.states = [initial]; this.samples = [sampleOf(initial)];
  }
  get calculatedTime() { return this.states[this.states.length - 1].time; }
  normalizeTime(time: number) {
    return Math.min(this.duration, Math.max(0, Math.round(time / PHYSICS_STEP) * PHYSICS_STEP));
  }
  calculateNext(): boolean {
    const previous = this.states[this.states.length - 1];
    if (previous.time >= this.duration) return false;
    const time = Math.min(this.duration, this.states.length * PHYSICS_STEP);
    const next = { ...computeEVStep(previous, this.cycle, time === this.duration ? Math.min(PHYSICS_STEP, this.duration - previous.time) : PHYSICS_STEP), time, cycleTime: time };
    this.states.push(next);
    if ((this.states.length - 1) % 4 === 0 || time === this.duration) this.samples.push(sampleOf(next));
    return true;
  }
  stateAt(time: number): EVState {
    const target = this.normalizeTime(time);
    const index = Math.min(Math.round(target / PHYSICS_STEP), this.states.length - 1);
    if (target > this.calculatedTime + 1e-8) throw new Error('Timeline state has not been calculated');
    return this.states[index];
  }
  summary(): CycleResult {
    const end = this.stateAt(this.duration);
    const distance = end.distance - this.initial.distance;
    const energyUsed = end.netEnergyUsed - this.initial.netEnergyUsed;
    return { cycleId: this.cycle.id, duration: this.duration, distance, soc: end.soc, energyUsed,
      averageConsumption: distance >= .01 ? energyUsed / distance * 100 : null };
  }
}
