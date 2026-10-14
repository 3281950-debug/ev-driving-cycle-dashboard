import { describe, it, expect } from 'vitest';
import {
  PANEL_REGISTRY,
  DEFAULT_PANEL_ID,
  getAvailablePanels,
  getPanel,
} from '@/panels/registry';

describe('panel/theme registry', () => {
  it('is discoverable — lists every registered panel', () => {
    const panels = getAvailablePanels();

    expect(panels).toHaveLength(Object.keys(PANEL_REGISTRY).length);
    const ids = panels.map(p => p.id);
    expect(ids).toContain('default');
    expect(ids).toContain('byd-king');
  });

  it('exposes shared metadata for every theme', () => {
    for (const panel of getAvailablePanels()) {
      expect(panel.id).toBeTruthy();
      expect(panel.name).toBeTruthy();
      expect(panel.description).toBeTruthy();
      // Every theme is a renderable React component → interchangeable.
      expect(typeof panel.component).toBe('function');
    }
  });

  it('can look up a theme by id', () => {
    const panel = getPanel('byd-king');
    expect(panel.id).toBe('byd-king');
    expect(panel.name).toBe('BYD King');
  });

  it('falls back to the default theme for unknown ids', () => {
    expect(getPanel('does-not-exist').id).toBe(DEFAULT_PANEL_ID);
    expect(getPanel('does-not-exist').kind).toBe('ev');
  });
});
