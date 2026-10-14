export type GaugeType = 'radial' | 'linear' | 'arc' | 'digital';

export interface GaugeZone {
  from: number;
  to: number;
  color: string;
}

export interface NeedleColors {
  start: string;
  end: string;
}

export interface ValueBoxColors {
  background: string;
  text: string;
}

export interface GaugeColors {
  plate: string;
  majorTicks: string;
  minorTicks: string;
  title: string;
  units: string;
  numbers: string;
  needle: NeedleColors;
  valueBox: ValueBoxColors;
  zones: GaugeZone[];
}

export interface GaugeConfig {
  type?: GaugeType;
  width?: number;
  height?: number;
  minValue: number;
  maxValue: number;
  majorTicks: number;
  minorTicks: number;
  units: string;
  title: string;
  valueFormat: (value: number) => string;
  animationSpeed: number;
  colors: GaugeColors;
}

export type GaugeColorsPartial = Partial<Omit<GaugeColors, 'needle' | 'valueBox'>> & {
  needle?: Partial<NeedleColors>;
  valueBox?: Partial<ValueBoxColors>;
};

export interface Point {
  x: number;
  y: number;
}

export interface GaugeDimensions {
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  valueRange: number;
}
