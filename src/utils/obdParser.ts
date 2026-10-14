import { PIDDefinition, ParsedOBDResponse, OBDMetrics } from '@/types/obd';

// ELM327 Bluetooth OBD-II Service UUIDs (Nordic UART Service)
export const OBD_SERVICES = {
  UART_SERVICE_UUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  RX_CHAR_UUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  TX_CHAR_UUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
} as const;

// OBD-II PID Calculation Matrix
export const PID_MATRIX: Record<string, PIDDefinition> = {
  '0C': {
    pid: '010C',
    name: 'rpm',
    description: 'Engine Speed (RPM)',
    formula: (a: number, b?: number) => Math.round(((a * 256) + (b || 0)) / 4),
    unit: 'RPM',
    min: 0,
    max: 16383,
  },
  '0D': {
    pid: '010D',
    name: 'speed',
    description: 'Vehicle Speed',
    formula: (a: number) => a,
    unit: 'km/h',
    min: 0,
    max: 255,
  },
  '04': {
    pid: '0104',
    name: 'engineLoad',
    description: 'Calculated Engine Load',
    formula: (a: number) => Math.round((a * 100) / 255),
    unit: '%',
    min: 0,
    max: 100,
  },
  '05': {
    pid: '0105',
    name: 'coolantTemp',
    description: 'Engine Coolant Temperature',
    formula: (a: number) => a - 40,
    unit: '°C',
    min: -40,
    max: 215,
  },
  '11': {
    pid: '0111',
    name: 'throttlePos',
    description: 'Absolute Throttle Position',
    formula: (a: number) => Math.round((a * 100) / 255),
    unit: '%',
    min: 0,
    max: 100,
  },
  '2F': {
    pid: '012F',
    name: 'fuelLevel',
    description: 'Fuel Level Input',
    formula: (a: number) => Math.round((a * 100) / 255),
    unit: '%',
    min: 0,
    max: 100,
  },
  '0F': {
    pid: '010F',
    name: 'intakeTemp',
    description: 'Intake Air Temperature',
    formula: (a: number) => a - 40,
    unit: '°C',
    min: -40,
    max: 215,
  },
  '10': {
    pid: '0110',
    name: 'maf',
    description: 'Mass Air Flow',
    formula: (a: number, b?: number) => ((a * 256) + (b || 0)) / 100,
    unit: 'g/s',
    min: 0,
    max: 655.35,
  },
  '0E': {
    pid: '010E',
    name: 'timingAdvance',
    description: 'Ignition Timing Advance',
    formula: (a: number) => a / 2 - 64,
    unit: '°',
    min: -64,
    max: 63.5,
  },
  '42': {
    pid: '0142',
    name: 'voltage',
    description: 'Control Module Voltage',
    formula: (a: number, b?: number) => ((a * 256) + (b || 0)) / 1000,
    unit: 'V',
    min: 0,
    max: 65.535,
  },
};

/**
 * Parse raw OBD-II hexadecimal response into meaningful metrics
 * @param rawString - Raw hex string from ELM327 (e.g., "41 0C 1A F8")
 * @returns Parsed OBD response or null if invalid
 */
export function parseOBDResponse(rawString: string): ParsedOBDResponse | null {
  // Clean the input string - remove spaces, carriage returns, prompts
  const cleanHex = rawString.replace(/[^0-9A-Fa-f]/g, '');
  
  // Must start with '41' (Mode 01 response)
  if (!cleanHex.startsWith('41')) return null;
  
  // Extract PID code (2 characters after '41')
  const pid = cleanHex.substring(2, 4);
  const pidDef = PID_MATRIX[pid];
  
  if (!pidDef) return null;
  
  // Extract data bytes based on PID requirements
  const a = parseInt(cleanHex.substring(4, 6), 16);
  const b = cleanHex.length >= 8 ? parseInt(cleanHex.substring(6, 8), 16) : 0;
  
  // Calculate value using PID formula
  const value = pidDef.formula(a, b);
  
  // Clamp value to valid range
  const clampedValue = Math.max(pidDef.min, Math.min(pidDef.max, value));
  
  return {
    type: pidDef.name as keyof OBDMetrics,
    value: clampedValue,
    rawHex: cleanHex,
    timestamp: Date.now(),
  };
}

/**
 * Convert km/h to mph
 */
export function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

/**
 * Convert °C to °F
 */
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5) + 32);
}

/**
 * Validate ELM327 response format
 */
export function isValidOBDResponse(response: string): boolean {
  const clean = response.replace(/[^0-9A-Fa-f]/g, '');
  return clean.length >= 6 && clean.startsWith('41');
}

/**
 * Generate ELM327 command string for a PID
 */
export function getPIDCommand(pid: string): string {
  return `${pid}\r`;
}

/**
 * Standard ELM327 initialization sequence
 */
export const ELM327_INIT_SEQUENCE = [
  'ATZ\r',      // Reset
  'ATE0\r',     // Echo off
  'ATL0\r',     // Linefeeds off
  'ATS0\r',     // Spaces off
  'ATH0\r',     // Headers off
  '0100\r',     // Search protocol
] as const;