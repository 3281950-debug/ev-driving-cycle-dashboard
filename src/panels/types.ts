import type { ComponentType } from 'react';
import type { OBDMetrics, ConnectionStatus, BluetoothDeviceInfo } from '@/types/obd';
import type { EVPanelProps } from '@/types/ev';

/**
 * The data contract every panel/theme receives.
 *
 * Panels are deliberately "dumb" views: all data acquisition (mock simulator +
 * Bluetooth), connection handling, PID selection live in a shared controller
 * (`useDashboardData`). This lets any registered theme render the exact same
 * live telemetry, which is what makes themes interchangeable.
 */
export interface PanelProps {
  /** Merged live telemetry (mock or Bluetooth depending on mode). */
  metrics: OBDMetrics & { gear?: number; drivingMode?: string };
  /** True when the shared controller is serving simulated data. */
  isMockMode: boolean;
  connectionStatus: ConnectionStatus;
  connectedDevice: BluetoothDeviceInfo | null;
  error: string | null;
  /** True when the browser supports the Web Bluetooth API. */
  isSupported: boolean;
  /** Currently monitored PID command list. */
  selectedPIDs: string[];
  /** Toggle a PID on/off in the monitoring set. */
  togglePID: (pid: string) => void;
  /** Switch between mock and live Bluetooth data. */
  toggleMode: () => void;
}

/**
 * A registrable panel/theme.
 *
 * Panels are created by defining a `PanelDefinition`, registering it with
 * `@/panels/registry`, and they instantly become discoverable via
 * `getAvailablePanels()` and selectable as an interchangeable theme.
 */
interface PanelMetadata {
  /** Unique registry key, e.g. `default` or `byd-king`. */
  id: string;
  /** Human readable panel/theme name shown in the picker. */
  name: string;
  /** Short description shown in the theme picker. */
  description: string;
  /** Subtitle / flavor text, e.g. "Web OBD-II Dashboard". */
  tagline?: string;
  /** The presentational component that renders the telemetry. */
}
export type PanelDefinition = PanelMetadata & (
  { kind: 'obd'; component: ComponentType<PanelProps> } |
  { kind: 'ev'; component: ComponentType<EVPanelProps> }
);
