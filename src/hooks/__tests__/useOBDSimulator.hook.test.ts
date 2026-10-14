import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOBDSimulator, DEFAULT_CONFIG } from '../useOBDSimulator';
import { OBDMetrics } from '@/types/obd';

describe('useOBDSimulator hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial metrics immediately when isMocking is true', () => {
    const { result } = renderHook(() => useOBDSimulator(true));
    expect(result.current.rpm).toBe(800);
    expect(result.current.speed).toBe(0);
    expect(result.current.coolantTemp).toBe(40);
    expect(result.current.fuelLevel).toBe(85);
    expect(result.current.gear).toBe(1);
    expect(result.current.drivingMode).toBe('city');
  });

  it('returns initial metrics and does not simulate when isMocking is false', () => {
    const { result } = renderHook(() => useOBDSimulator(false));
    expect(result.current.rpm).toBe(800);
    expect(result.current.speed).toBe(0);
    expect(result.current.gear).toBe(1);
    expect(result.current.drivingMode).toBe('city');
  });

  it('updates metrics after one interval tick', () => {
    const { result } = renderHook(() => useOBDSimulator(true));
    const initialRpm = result.current.rpm;
    const initialSpeed = result.current.speed;

    act(() => {
      vi.advanceTimersByTime(DEFAULT_CONFIG.updateInterval);
    });

    // At least one field should have changed after a tick
    const changed =
      result.current.rpm !== initialRpm ||
      result.current.speed !== initialSpeed;
    expect(changed).toBe(true);
  });

  it('keeps RPM >= 750 after many ticks', () => {
    const { result } = renderHook(() => useOBDSimulator(true));

    act(() => {
      vi.advanceTimersByTime(DEFAULT_CONFIG.updateInterval * 100);
    });

    expect(result.current.rpm).toBeGreaterThanOrEqual(750);
  });

  it('does not drain fuel to zero after an extended simulation', () => {
    const { result } = renderHook(() => useOBDSimulator(true));

    act(() => {
      vi.advanceTimersByTime(DEFAULT_CONFIG.updateInterval * 200);
    });

    expect(result.current.fuelLevel).toBeGreaterThan(0);
  });

  it('stops simulation when toggling isMocking from true to false', () => {
    const { result, rerender } = renderHook(
      ({ isMocking }) => useOBDSimulator(isMocking),
      { initialProps: { isMocking: true } }
    );

    // Let one tick fire
    act(() => {
      vi.advanceTimersByTime(DEFAULT_CONFIG.updateInterval);
    });
    const rpmAfterFirstTick = result.current.rpm;

    // Toggle off
    rerender({ isMocking: false });

    // Advance many ticks — interval should be cleared
    act(() => {
      vi.advanceTimersByTime(DEFAULT_CONFIG.updateInterval * 50);
    });

    expect(result.current.rpm).toBe(rpmAfterFirstTick);
  });

  it('respects a custom updateInterval from config', () => {
    const { result } = renderHook(() =>
      useOBDSimulator(true, { updateInterval: 200 })
    );

    const rpmBefore = result.current.rpm;

    // Advance just short of the 200ms interval
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current.rpm).toBe(rpmBefore);

    // Cross the 200ms threshold
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.rpm).not.toBe(rpmBefore);
  });

  it('includes all OBDMetrics fields in the return value', () => {
    const { result } = renderHook(() => useOBDSimulator(true));
    const expectedKeys: (keyof OBDMetrics)[] = [
      'rpm', 'speed', 'engineLoad', 'coolantTemp', 'throttlePos',
      'fuelLevel', 'intakeTemp', 'maf', 'timingAdvance', 'voltage',
    ];
    expectedKeys.forEach(key => {
      expect(result.current).toHaveProperty(key);
      expect(typeof result.current[key]).toBe('number');
    });
  });

  it('returns gear and drivingMode properties', () => {
    const { result } = renderHook(() => useOBDSimulator(true));
    expect(result.current).toHaveProperty('gear');
    expect(result.current).toHaveProperty('drivingMode');
    expect(typeof result.current.gear).toBe('number');
    expect(typeof result.current.drivingMode).toBe('string');
  });

  it('cycles drivingMode after 30 seconds', () => {
    const { result } = renderHook(() => useOBDSimulator(true));
    expect(result.current.drivingMode).toBe('city');

    // Advance 30 seconds (mode change threshold)
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.drivingMode).toBe('highway');

    // Advance another 30s
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.drivingMode).toBe('track');
  });
});
