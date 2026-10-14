import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEVSimulator } from '../useEVSimulator';
import { cycles } from '@/drivingCycles';

describe('Phase 1 controls', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it.each([1, 4, 16, 64] as const)('advances at %sx and keeps pause after changing speed', speed => {
    const { result } = renderHook(() => useEVSimulator());
    act(() => { result.current.setSimulationSpeed(speed); result.current.start(); vi.advanceTimersByTime(1000); });
    expect(result.current.state.time).toBeCloseTo(speed, 8);
    act(() => { result.current.pause(); result.current.setSimulationSpeed(8); vi.advanceTimersByTime(1000); });
    expect(result.current.status).toBe('PAUSED');
    expect(result.current.state.time).toBeCloseTo(speed, 8);
  });
  it.each(Object.keys(cycles) as (keyof typeof cycles)[])('completes %s, freezes, replays exact checkpoints and resumes', async id => {
    const { result } = renderHook(() => useEVSimulator());
    act(() => result.current.setCycle(id));
    await act(async () => { const done = result.current.complete(); await vi.advanceTimersByTimeAsync(1000); await done; });
    expect(result.current.status).toBe('COMPLETED');
    const end = result.current.state;
    const endpoint = result.current.duration;
    expect(end.time).toBe(endpoint);
    expect(result.current.history[0].time).toBe(0);
    expect(result.current.history[result.current.history.length - 1].time).toBe(endpoint);
    expect(result.current.result?.soc).toBe(end.soc);
    act(() => { result.current.start(); vi.advanceTimersByTime(1000); });
    expect(result.current.state).toBe(end);
    for (const fraction of [.25, .5, .75, 1]) {
      await act(async () => { const done = result.current.seek(endpoint * fraction); await vi.advanceTimersByTimeAsync(50); await done; });
      expect(result.current.state.time).toBeCloseTo(endpoint * fraction, 8);
      expect(result.current.state.batteryEnergy + result.current.state.netEnergyUsed).toBeCloseTo(48.384, 9);
      expect(result.current.result?.soc).toBe(end.soc);
    }
    await act(async () => { const done = result.current.seek(endpoint / 2); await vi.advanceTimersByTimeAsync(50); await done; });
    act(() => { result.current.start(); vi.advanceTimersByTime(1000); });
    expect(result.current.state.time).toBeCloseTo(endpoint / 2 + 1, 8);
    await act(async () => { const done = result.current.complete(); await vi.advanceTimersByTimeAsync(50); await done; });
    expect(result.current.state).toEqual(end);
  });
  it('completes from a running/paused checkpoint without changing the physical endpoint', async () => {
    const { result } = renderHook(() => useEVSimulator());
    act(() => { result.current.start(); vi.advanceTimersByTime(10000); result.current.pause(); });
    const currentEnergy = result.current.state.batteryEnergy;
    await act(async () => { const done = result.current.complete(); await vi.advanceTimersByTimeAsync(1000); await done; });
    expect(result.current.status).toBe('COMPLETED');
    expect(result.current.state.batteryEnergy).toBeLessThan(currentEnergy);
  });
  it('cancels pending calculations on reset, cycle changes and a newer seek', async () => {
    const { result } = renderHook(() => useEVSimulator());
    await act(async () => {
      const pending = result.current.complete(); result.current.reset();
      await vi.advanceTimersByTimeAsync(1000); await pending;
    });
    expect(result.current.state.time).toBe(0);
    expect(result.current.status).toBe('STOPPED');
    await act(async () => {
      const first = result.current.seek(225); const second = result.current.seek(75);
      await vi.advanceTimersByTimeAsync(1000); await Promise.all([first, second]);
    });
    expect(result.current.state.time).toBe(75);
    await act(async () => {
      const pending = result.current.complete(); result.current.setCycle('US06');
      await vi.advanceTimersByTimeAsync(1000); await pending;
    });
    expect(result.current.cycleId).toBe('US06');
    expect(result.current.state.time).toBe(0);
    expect(result.current.busy).toBe(false);
    expect(result.current.result).toBeNull();
  });
});
