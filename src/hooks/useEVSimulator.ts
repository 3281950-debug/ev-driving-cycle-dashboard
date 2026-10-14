import { useCallback, useEffect, useRef, useState } from 'react';
import { cycles } from '@/drivingCycles';
import { appendHistory, initialEVState } from '@/simulation/simulationEngine';
import { PHYSICS_STEP, SimulationTimeline } from '@/simulation/timeline';
import type { CycleId, CycleResult, EVPanelProps, SimulationSpeed, SimulationStatus, TelemetrySample } from '@/types/ev';

function initialController() {
  return { state: initialEVState(), history: [] as TelemetrySample[], cycleId: 'CLTC' as CycleId,
    status: 'STOPPED' as SimulationStatus, simulationSpeed: 1 as SimulationSpeed, engineeringMode: false,
    busy: false, targetTime: null as number | null, result: null as CycleResult | null,
    error: null as string | null, chartDuration: null as number | null };
}

export function useEVSimulator(): EVPanelProps {
  const [snapshot, setSnapshot] = useState(initialController);
  const controller = useRef(snapshot);
  const timeline = useRef(new SimulationTimeline(cycles.CLTC, snapshot.state));
  const accumulator = useRef(0);
  const nextSample = useRef(.2);
  const lastTick = useRef(0);
  const operation = useRef(0);
  const mounted = useRef(true);
  const publish = useCallback(() => { if (mounted.current) setSnapshot({ ...controller.current }); }, []);
  const finish = useCallback(() => {
    const c = controller.current;
    c.status = 'COMPLETED'; c.result = timeline.current.summary();
    c.history = [...timeline.current.samples]; c.chartDuration = timeline.current.duration;
    accumulator.current = 0;
  }, []);

  useEffect(() => {
    const cancellation = operation;
    mounted.current = true;
    lastTick.current = Date.now();
    const onVisibility = () => { lastTick.current = Date.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(.1, Math.max(0, (now - lastTick.current) / 1000));
      lastTick.current = now;
      const c = controller.current;
      if (c.status !== 'RUNNING' || c.busy || document.visibilityState === 'hidden') return;
      accumulator.current += elapsed * c.simulationSpeed;
      while (accumulator.current >= PHYSICS_STEP - 1e-9) {
        const t = timeline.current;
        if (c.state.time >= t.duration) { finish(); break; }
        const target = Math.min(t.duration, c.state.time + PHYSICS_STEP);
        if (target > t.calculatedTime + 1e-8) t.calculateNext();
        c.state = t.stateAt(target);
        accumulator.current = Math.max(0, accumulator.current - PHYSICS_STEP);
        if (c.chartDuration === null && c.state.time >= nextSample.current - 1e-8) {
          c.history = appendHistory(c.history, c.state); nextSample.current += .2;
        }
        if (c.state.time >= t.duration) { finish(); break; }
      }
      if (c.chartDuration !== null) c.history = [...timeline.current.samples];
      publish();
    }, 50);
    return () => { mounted.current = false; cancellation.current++; clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [finish, publish]);

  const start = useCallback(() => {
    const c = controller.current;
    if (c.busy || c.status === 'COMPLETED') return;
    c.status = 'RUNNING'; lastTick.current = Date.now(); publish();
  }, [publish]);
  const pause = useCallback(() => { if (controller.current.status === 'RUNNING') controller.current.status = 'PAUSED'; publish(); }, [publish]);
  const reset = useCallback(() => {
    operation.current++; controller.current = initialController();
    timeline.current = new SimulationTimeline(cycles.CLTC, controller.current.state);
    accumulator.current = 0; nextSample.current = .2; lastTick.current = Date.now(); publish();
  }, [publish]);
  const setCycle = useCallback((id: CycleId) => {
    operation.current++;
    const c = controller.current, prev = c.state;
    c.cycleId = id;
    c.state = { ...initialEVState(), soc: prev.soc, batteryEnergy: prev.batteryEnergy,
      batteryVoltage: prev.batteryVoltage, batteryTemperature: prev.batteryTemperature,
      estimatedRange: prev.estimatedRange, distance: prev.distance, netEnergyUsed: prev.netEnergyUsed,
      averageConsumption: prev.averageConsumption };
    c.status = 'STOPPED'; c.busy = false; c.targetTime = null; c.error = null;
    c.result = null; c.chartDuration = null; c.history = [];
    timeline.current = new SimulationTimeline(cycles[id], c.state);
    accumulator.current = 0; nextSample.current = .2; lastTick.current = Date.now(); publish();
  }, [publish]);
  const calculateTo = useCallback(async (requested: number) => {
    const ticket = ++operation.current;
    const t = timeline.current, c = controller.current;
    const target = t.normalizeTime(requested);
    c.status = 'PAUSED'; c.busy = true; c.targetTime = target; c.error = null;
    accumulator.current = 0; publish();
    try {
      // Yield before and between 8ms slices, keeping controls and painting responsive.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      while (t.calculatedTime < target - 1e-8) {
        if (!mounted.current || ticket !== operation.current) return;
        const deadline = performance.now() + 8;
        do { t.calculateNext(); } while (t.calculatedTime < target - 1e-8 && performance.now() < deadline);
        if (t.calculatedTime < target - 1e-8) await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
      if (!mounted.current || ticket !== operation.current) return;
      c.state = t.stateAt(target); c.busy = false; c.targetTime = null;
      c.history = [...t.samples]; c.chartDuration = t.duration;
      nextSample.current = Math.floor(target / .2 + 1) * .2;
      if (target >= t.duration) finish();
      publish();
    } catch {
      if (ticket !== operation.current || !mounted.current) return;
      c.busy = false; c.targetTime = null; c.error = '计算失败，请重置后重试。'; publish();
    }
  }, [finish, publish]);
  const complete = useCallback(async () => {
    if (controller.current.busy || controller.current.status === 'COMPLETED') return;
    await calculateTo(timeline.current.duration);
  }, [calculateTo]);
  const seek = useCallback(async (time: number) => { if (Number.isFinite(time)) await calculateTo(time); }, [calculateTo]);
  const setSimulationSpeed = useCallback((speed: SimulationSpeed) => { controller.current.simulationSpeed = speed; publish(); }, [publish]);
  const toggleEngineeringMode = useCallback(() => { controller.current.engineeringMode = !controller.current.engineeringMode; publish(); }, [publish]);
  return { ...snapshot, duration: timeline.current.duration, start, pause, reset, setCycle,
    complete, seek, setSimulationSpeed, toggleEngineeringMode };
}
