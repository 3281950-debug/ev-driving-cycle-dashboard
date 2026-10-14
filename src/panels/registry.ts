import type { PanelDefinition } from './types';
import { DefaultPanel } from './DefaultPanel';
import { BYDKingPanel } from './BYDKingPanel';
import { EVEngineeringPanel } from './EVEngineeringPanel';

/**
 * Theme/panel register.
 *
 * Adding a new theme is two steps: create a `PanelDefinition` (metadata +
 * presentational component) and add it to `PANEL_REGISTRY` below. It then
 * becomes discoverable via `getAvailablePanels()` and switchable as an
 * interchangeable theme in the UI.
 */
export const PANEL_REGISTRY: Record<string, PanelDefinition> = {
  'ev-engineering': {
    id: 'ev-engineering', kind: 'ev', name: '新能源工程',
    description: 'BYD ATTO 3 · 纯电动力学与行驶工况仿真。',
    component: EVEngineeringPanel,
  },
  default: {
    kind: 'obd',
    id: 'default',
    name: '经典仪表',
    description: '经典 OBD-II 多仪表面板，支持 PID 监测选择。',
    tagline: 'OBD-II 车辆仪表盘',
    component: DefaultPanel,
  },
  'byd-king': {
    kind: 'obd',
    id: 'byd-king',
    name: 'BYD King',
    description: 'BYD King 主面板 · 汽车座舱主题。',
    tagline: 'BYD King 主面板',
    component: BYDKingPanel,
  },
};

/** Default theme id used on first load (before any user preference exists). */
export const DEFAULT_PANEL_ID = 'ev-engineering';

/** All available (discoverable) themes. */
export function getAvailablePanels(): PanelDefinition[] {
  return Object.values(PANEL_REGISTRY);
}

/** Look up a single theme by id, falling back to the default. */
export function getPanel(id: string): PanelDefinition {
  return PANEL_REGISTRY[id] ?? PANEL_REGISTRY[DEFAULT_PANEL_ID];
}
