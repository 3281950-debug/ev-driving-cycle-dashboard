import type { DrivingCycle, EVState, TelemetrySample } from '@/types/ev';
import { speedAt } from '@/drivingCycles';
import { vehicle } from './vehicleConfig';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function initialEVState(): EVState {
  return {
    time: 0, cycleTime: 0, speed: 0, acceleration: 0, wheelRpm: 0,
    motorRpm: 0, motorTorque: 0, motorPower: 0, motorEfficiency: 90,
    regenPower: 0, batteryEnergy: 48.384, soc: 80, batteryVoltage: 398,
    batteryCurrent: 0, batteryPower: 0, batteryTemperature: 32,
    estimatedRange: 368, distance: 0, netEnergyUsed: 0,
    instantConsumption: null, averageConsumption: null,
    aerodynamicPower: 0, rollingPower: 0, gear: 'P',
  };
}

/** Fixed-step longitudinal demo model. No randomness or React dependencies. */
export function computeEVStep(state: EVState, cycle: DrivingCycle, dt: number): EVState {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .050001) throw new Error('Use fixed positive steps of at most 0.05s');
  const cfg = vehicle;
  const time = state.time + dt;
  const target = speedAt(cycle.samples, time) / 3.6;
  const v = state.speed / 3.6;
  const dragForce = .5 * cfg.rho * cfg.cd * cfg.area * v * v;
  const rollingForce = v > 0 || target > 0 ? cfg.mass * cfg.gravity * cfg.crr : 0;
  const resistance = dragForce + rollingForce;
  const requestedAcceleration = clamp((target - v) / dt, -3.5, 3.8);
  const requestedForce = cfg.mass * requestedAcceleration + resistance;
  const trialV = Math.max(v, v + requestedAcceleration * dt, .1);
  // Bound traction BEFORE advancing speed. Reserve auxiliary energy and use
  // the model's minimum efficiency as a conservative discharge envelope.
  const availableShaftPower = Math.max(0, state.batteryEnergy * 3600 / dt - cfg.auxiliaryPower) * .82;
  const maxForce = Math.min(cfg.maxTorque * cfg.finalDrive * cfg.transmissionEfficiency / cfg.wheelRadius, Math.min(cfg.maxPower, availableShaftPower) * 1000 * cfg.transmissionEfficiency / trialV);
  const force = requestedForce > 0 ? Math.min(requestedForce, state.batteryEnergy > 0 ? maxForce : 0) : requestedForce;
  const nextV = Math.max(0, v + (force - resistance) / cfg.mass * dt);
  const acceleration = (nextV - v) / dt;
  const wheelRpm = nextV / cfg.wheelRadius * 30 / Math.PI;
  const motorRpm = wheelRpm * cfg.finalDrive;
  // Simulation Assumption: smooth efficiency envelope, 82–95%, no efficiency map.
  const efficiency = clamp(.94 - .06 * Math.abs(motorRpm / 9000 - .55) - .04 * Math.exp(-Math.abs(force) / 800), .82, .95);
  let motorPower = Math.max(0, force) * nextV / cfg.transmissionEfficiency / 1000;
  let regenPower = 0;
  if (force < 0 && nextV > 0) {
    const mechanicalAvailable = -force * nextV * cfg.transmissionEfficiency / 1000;
    const fullBatteryTaper = clamp((100 - state.soc) / 5, 0, 1);
    const lowSpeedTaper = clamp(nextV / 3, 0, 1);
    regenPower = -Math.min(mechanicalAvailable * efficiency, cfg.maxRegen, cfg.maxTorque * motorRpm * Math.PI / 30000 * efficiency) * fullBatteryTaper * lowSpeedTaper;
    if (regenPower === 0) regenPower = 0; // Normalize signed zero for no-recovery state.
    motorPower = regenPower / efficiency;
  }
  let batteryPower = (motorPower >= 0 ? motorPower / efficiency : regenPower) + cfg.auxiliaryPower;
  if (state.batteryEnergy <= 0 && batteryPower > 0) batteryPower = 0;
  batteryPower = clamp(batteryPower, -(cfg.capacity - state.batteryEnergy) * 3600 / dt, state.batteryEnergy * 3600 / dt);
  const batteryEnergy = clamp(state.batteryEnergy - batteryPower * dt / 3600, 0, cfg.capacity);
  const soc = batteryEnergy / cfg.capacity * 100;
  const batteryVoltage = 350 + soc * .6;
  const distance = state.distance + (v + nextV) / 2 * dt / 1000;
  const netEnergyUsed = state.netEnergyUsed + batteryPower * dt / 3600;
  const speed = nextV * 3.6;
  return {
    time, cycleTime: time % cycle.samples[cycle.samples.length - 1].time,
    speed, acceleration, wheelRpm, motorRpm,
    motorTorque: motorRpm > 0 ? motorPower * 30000 / (Math.PI * motorRpm) : force > 0 ? force * cfg.wheelRadius / (cfg.finalDrive * cfg.transmissionEfficiency) : 0,
    motorPower, motorEfficiency: efficiency * 100, regenPower, batteryEnergy, soc,
    batteryVoltage, batteryCurrent: batteryPower * 1000 / batteryVoltage, batteryPower,
    // Simulation Assumption: lumped thermal mass with passive ambient cooling.
    batteryTemperature: state.batteryTemperature + (batteryPower * batteryPower * .000008 - (state.batteryTemperature - cfg.ambientTemperature) * .0008) * dt,
    estimatedRange: soc / 100 * cfg.range, distance, netEnergyUsed,
    instantConsumption: speed >= 3 ? batteryPower / speed * 100 : null,
    averageConsumption: distance >= .01 ? netEnergyUsed / distance * 100 : null,
    aerodynamicPower: .5 * cfg.rho * cfg.cd * cfg.area * nextV ** 3 / 1000,
    rollingPower: nextV > 0 ? cfg.mass * cfg.gravity * cfg.crr * nextV / 1000 : 0,
    gear: 'D',
  };
}

/** Time-bounded and capacity-bounded buffer. Both limits hold across multipliers. */
export function appendHistory(history: TelemetrySample[], state: EVState): TelemetrySample[] {
  const sample: TelemetrySample = { time: state.time, speed: state.speed, motorPower: state.motorPower, batteryPower: state.batteryPower, regenPower: state.regenPower };
  return [...history.filter(point => point.time >= state.time - 60), sample].slice(-301);
}
