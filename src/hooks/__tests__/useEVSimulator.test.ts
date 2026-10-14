import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useEVSimulator } from '../useEVSimulator';

describe('EV simulation controller', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('starts, freezes all telemetry on pause and resumes', () => {
    const { result, unmount } = renderHook(() => useEVSimulator());
    expect(result.current.status).toBe('STOPPED');
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(20000); });
    expect(result.current.state.time).toBeCloseTo(20, 6);
    expect(result.current.state.speed).toBeGreaterThan(0);
    act(() => { result.current.pause(); });
    const frozen = result.current.state;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.state).toEqual(frozen);
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.state.time).toBeCloseTo(21, 6);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([.5, 1, 2, 4] as const)('advances by %s times wall clock', multiplier => {
    const { result } = renderHook(() => useEVSimulator());
    act(() => { result.current.setSimulationSpeed(multiplier); result.current.start(); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current.state.time).toBeCloseTo(10 * multiplier, 6);
  });
  it('switches every cycle without restoring SOC and resets complete state', () => {
    const { result } = renderHook(() => useEVSimulator());
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(60000); });
    const soc = result.current.state.soc;
    for (const id of ['NEDC', 'WLTP', 'FTP-75', 'US06', 'JC08', 'CLTC'] as const) {
      act(() => { result.current.setCycle(id); });
      expect(result.current.cycleId).toBe(id);
      expect(result.current.state.time).toBe(0);
      expect(result.current.state.soc).toBe(soc);
      expect(result.current.history).toHaveLength(0);
    }
    act(() => { result.current.toggleEngineeringMode(); result.current.setSimulationSpeed(4); result.current.reset(); });
    expect(result.current.engineeringMode).toBe(false);
    expect(result.current.simulationSpeed).toBe(1);
    expect(result.current.state.soc).toBe(80);
    expect(result.current.state.batteryEnergy).toBe(48.384);
    expect(result.current.state.speed).toBe(0);
    expect(result.current.status).toBe('STOPPED');
  });
  it('stops at the endpoint and retains a bounded complete-cycle history after extended 4x running', () => {
    const { result } = renderHook(() => useEVSimulator());
    act(() => { result.current.setSimulationSpeed(4); result.current.start(); });
    act(() => { vi.advanceTimersByTime(180000); });
    expect(result.current.status).toBe('COMPLETED');
    expect(result.current.state.time).toBe(300);
    expect(result.current.history).toHaveLength(1501);
    expect(result.current.history[0].time).toBe(0);
    const end = result.current.state;
    act(() => { vi.advanceTimersByTime(180000); });
    expect(result.current.state).toBe(end);
  });
  it('produces the same energy and distance at all multipliers for the same simulated duration', () => {
    const states = ([.5, 1, 2, 4] as const).map(speed => {
      const { result, unmount } = renderHook(() => useEVSimulator());
      act(() => { result.current.setSimulationSpeed(speed); result.current.start(); });
      act(() => { vi.advanceTimersByTime(120000 / speed); });
      const state = result.current.state;
      unmount();
      return state;
    });
    states.forEach(state => {
      expect(state.batteryEnergy).toBeCloseTo(states[0].batteryEnergy, 9);
      expect(state.distance).toBeCloseTo(states[0].distance, 9);
    });
  });
  it('does not accumulate elapsed time while a page is hidden', () => {
    const { result } = renderHook(() => useEVSimulator());
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(1000); });
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(60000); });
    expect(result.current.state.time).toBeCloseTo(1, 6);
    visibility.mockReturnValue('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(1000); });
    expect(result.current.state.time).toBeCloseTo(2, 6);
    visibility.mockRestore();
  });
});
