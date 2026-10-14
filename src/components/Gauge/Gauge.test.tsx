import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Gauge } from './Gauge';

afterEach(() => vi.restoreAllMocks());

it('preserves the mounted Canvas instance across live value updates', () => {
  // happy-dom has no raster renderer. Only replace that browser boundary;
  // the real React wrapper, effects and GaugeCanvas lifecycle are exercised.
  const context = new Proxy({ createLinearGradient: () => ({ addColorStop: () => {} }) }, {
    get(target, key) { return key in target ? target[key as keyof typeof target] : () => {}; },
    set() { return true; },
  }) as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  const mounted: HTMLCanvasElement[] = [];
  const onRender = (canvas: HTMLCanvasElement) => mounted.push(canvas);
  const { rerender, unmount } = render(<Gauge value={0} type="arc" onRender={onRender} />);
  rerender(<Gauge value={30} type="arc" onRender={onRender} />);
  rerender(<Gauge value={60} type="arc" onRender={onRender} />);
  expect(mounted).toHaveLength(1);
  unmount();
});
