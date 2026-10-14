export interface OBDServices {
  UART_SERVICE_UUID: string;
  RX_CHAR_UUID: string;
  TX_CHAR_UUID: string;
}

export interface OBDMetrics {
  rpm: number;
  speed: number;
  engineLoad: number;
  coolantTemp: number;
  throttlePos: number;
  fuelLevel: number;
  intakeTemp?: number;
  maf?: number;
  timingAdvance?: number;
  voltage?: number;
}

export interface PIDDefinition {
  pid: string;
  name: string;
  description: string;
  formula: (a: number, b?: number) => number;
  unit: string;
  min: number;
  max: number;
}

export interface ParsedOBDResponse {
  type: keyof OBDMetrics;
  value: number;
  rawHex: string;
  timestamp: number;
}

export type ConnectionStatus = 
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'initializing';

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  rssi?: number;
}