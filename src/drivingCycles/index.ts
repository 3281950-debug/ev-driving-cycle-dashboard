import type { CycleId, CycleSample, DrivingCycle } from '@/types/ev';

export function validateSamples(samples: CycleSample[]): void {
  if (samples.length < 2 || samples[0].time !== 0) throw new Error('Cycle must start at t=0 and contain at least two samples');
  samples.forEach((sample, i) => {
    if (!Number.isFinite(sample.time) || !Number.isFinite(sample.speed) || sample.speed < 0 || (i > 0 && sample.time <= samples[i - 1].time)) {
      throw new Error('Cycle times must increase and speeds must be finite and nonnegative');
    }
  });
}

function makeCycle(id: CycleId, description: string, points: [number, number][]): DrivingCycle {
  const samples = points.map(([time, speed]) => ({ time, speed }));
  validateSamples(samples);
  return { id, description, samples };
}

// Approximate demo profiles, NOT official regulatory traces. CSV adapters can
// replace these arrays directly after passing validateSamples(). Units: s, km/h.
export const cycles: Record<CycleId, DrivingCycle> = {
  CLTC: makeCycle('CLTC', 'Soft urban transitions · frequent stops', [[0,0],[5,0],[25,32],[40,32],[55,0],[65,0],[90,48],[110,25],[125,0],[140,0],[170,65],[195,45],[220,0],[230,0],[265,80],[280,55],[300,0]]),
  NEDC: makeCycle('NEDC', 'Regular ramps · gentle pacing', [[0,0],[10,0],[30,20],[50,20],[65,0],[80,0],[110,40],[140,40],[160,0],[175,0],[210,70],[240,70],[265,90],[285,60],[315,0]]),
  WLTP: makeCycle('WLTP', 'Mixed low, medium and high speed', [[0,0],[5,0],[18,40],[30,15],[45,55],[60,0],[70,0],[95,75],[110,40],[125,90],[145,60],[170,110],[190,80],[215,125],[235,95],[270,0]]),
  'FTP-75': makeCycle('FTP-75', 'Urban stop and go · varied pace', [[0,0],[6,0],[20,45],[33,20],[45,0],[55,0],[70,55],[90,40],[108,0],[118,0],[145,70],[160,35],[175,0],[190,0],[210,50],[225,20],[240,0]]),
  US06: makeCycle('US06', 'Aggressive acceleration · high power demand', [[0,0],[3,0],[14,100],[25,120],[33,55],[42,130],[55,100],[65,140],[85,140],[100,60],[110,0],[120,0],[132,110],[150,135],[165,70],[180,145],[205,120],[220,40],[230,0],[245,0],[257,120],[280,130],[300,0]]),
  JC08: makeCycle('JC08', 'Low speed · frequent short stops', [[0,0],[8,0],[20,22],[30,0],[40,0],[55,35],[68,10],[75,0],[88,0],[105,40],[120,20],[135,0],[148,0],[168,30],[182,0],[195,0],[215,45],[235,25],[255,0]]),
};

export function speedAt(samples: CycleSample[], time: number): number {
  const duration = samples[samples.length - 1].time;
  const t = ((time % duration) + duration) % duration;
  let low = 0, high = samples.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (samples[mid].time <= t) low = mid; else high = mid;
  }
  const a = samples[low], b = samples[high];
  return a.speed + (b.speed - a.speed) * (t - a.time) / (b.time - a.time);
}
