export const vehicle = {
  name: 'BYD ATTO 3', powertrain: 'BEV', capacity: 60.48, range: 460,
  drive: 'FWD', zeroToHundred: 7.3,
  // Simulation Assumption: all physical/thermal parameters below are demo
  // estimates, not official BYD vehicle calibration or specifications.
  mass: 1750, cd: .29, area: 2.5, crr: .01, rho: 1.225, gravity: 9.81,
  wheelRadius: .33, finalDrive: 9.1, transmissionEfficiency: .97,
  maxPower: 150, maxTorque: 310, maxRegen: 60, auxiliaryPower: .7,
  ambientTemperature: 25,
} as const;
