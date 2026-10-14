import { GaugeConfig, GaugeDimensions, Point } from './types';

export class GaugeCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GaugeConfig;
  private dimensions: GaugeDimensions;
  private currentValue: number = 0;

  constructor(canvas: HTMLCanvasElement, config: GaugeConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.dimensions = this.calculateDimensions();
  }

  private calculateDimensions(): GaugeDimensions {
    const { width = 300, height = 300, type = 'radial', minValue, maxValue } = this.config;
    
    if (type === 'radial' || type === 'arc') {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.4;
      
      // Radial gauge: 225° to -45° (270° total)
      const startAngle = (5 * Math.PI) / 4; // 225°
      const endAngle = -Math.PI / 4; // -45°
      
      return {
        centerX,
        centerY,
        radius,
        startAngle,
        endAngle,
        valueRange: maxValue - minValue,
      };
    } else {
      // Linear gauge
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.4;
      
      return {
        centerX,
        centerY,
        radius,
        startAngle: 0,
        endAngle: Math.PI,
        valueRange: maxValue - minValue,
      };
    }
  }

  draw(value: number): void {
    this.currentValue = value;
    this.clearCanvas();
    if (this.config.type === 'arc') { this.drawArc(); return; }
    if (this.config.type === 'linear') { this.drawLinear(); return; }
    this.drawPlate();
    this.drawZones();
    this.drawTicks();
    this.drawNumbers();
    this.drawTitle();
    this.drawUnits();
    this.drawNeedle();
    this.drawValueBox();
  }

  updateConfig(config: GaugeConfig): void {
    this.config = config;
    this.dimensions = this.calculateDimensions();
  }

  private drawArc(): void {
    const { width = 300, height = 300, colors, minValue, maxValue } = this.config;
    const x = width / 2, y = height * .53, r = Math.min(width * .38, height * .46);
    const start = .75 * Math.PI, sweep = 1.5 * Math.PI;
    const fraction = Math.max(0, Math.min(1, (this.currentValue - minValue) / (maxValue - minValue)));
    this.ctx.lineCap = 'round'; this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#2b3944'; this.ctx.beginPath(); this.ctx.arc(x, y, r, start, start + sweep); this.ctx.stroke();
    if (fraction > 0) {
      this.ctx.strokeStyle = colors.zones[0]?.color || colors.numbers;
      this.ctx.lineWidth = 5;
      this.ctx.beginPath(); this.ctx.arc(x, y, r, start, start + sweep * fraction); this.ctx.stroke();
    }
    this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillStyle = colors.numbers;
    this.ctx.font = '12px "Microsoft YaHei", "PingFang SC", system-ui';
    for (let i = 0; i <= this.config.majorTicks; i++) {
      const angle = start + sweep * i / this.config.majorTicks;
      this.ctx.lineWidth = 1; this.ctx.strokeStyle = colors.majorTicks;
      this.ctx.beginPath(); this.ctx.moveTo(x + Math.cos(angle) * (r - 5), y + Math.sin(angle) * (r - 5));
      this.ctx.lineTo(x + Math.cos(angle) * (r - 10), y + Math.sin(angle) * (r - 10)); this.ctx.stroke();
      this.ctx.fillText(String(Math.round(minValue + (maxValue - minValue) * i / this.config.majorTicks)), x + Math.cos(angle) * (r - 23), y + Math.sin(angle) * (r - 23));
    }
    // Arial's equal-width decimal digits keep the readout stable without a slashed zero.
    this.ctx.fillStyle = '#edf3f7'; this.ctx.font = `400 ${Math.min(width * .25, 120)}px Arial, "Helvetica Neue", sans-serif`;
    this.ctx.fillText(this.config.valueFormat(this.currentValue), x, y - 4);
    this.ctx.fillStyle = colors.units; this.ctx.font = '14px "Microsoft YaHei", "PingFang SC", system-ui'; this.ctx.fillText(this.config.units, x, y + 72);
  }

  private drawLinear(): void {
    const { width = 300, height = 100, minValue, maxValue, colors } = this.config;
    const fraction = Math.max(0, Math.min(1, (this.currentValue - minValue) / (maxValue - minValue)));
    this.ctx.fillStyle = '#2b3944'; this.ctx.fillRect(20, height * .55, width - 40, 8);
    this.ctx.fillStyle = colors.zones[0]?.color || colors.numbers; this.ctx.fillRect(20, height * .55, (width - 40) * fraction, 8);
    this.ctx.font = '14px "Microsoft YaHei", "PingFang SC", system-ui'; this.ctx.fillStyle = colors.numbers; this.ctx.textAlign = 'center';
    this.ctx.fillText(`${this.config.title} ${this.config.valueFormat(this.currentValue)} ${this.config.units}`, width / 2, height * .35);
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawPlate(): void {
    const { centerX, centerY, radius } = this.dimensions;
    const { colors } = this.config;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = colors.plate;
    this.ctx.fill();
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawZones(): void {
    const { centerX, centerY, radius, startAngle, endAngle, valueRange } = this.dimensions;
    const { colors, minValue } = this.config;

    colors.zones.forEach(zone => {
      const zoneStartAngle = this.valueToAngle(zone.from - minValue, valueRange, startAngle, endAngle);
      const zoneEndAngle = this.valueToAngle(zone.to - minValue, valueRange, startAngle, endAngle);

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius * 0.9, zoneStartAngle, zoneEndAngle);
      this.ctx.lineWidth = radius * 0.2;
      this.ctx.strokeStyle = zone.color;
      this.ctx.stroke();
    });
  }

  private drawTicks(): void {
    const { centerX, centerY, radius, startAngle, endAngle, valueRange } = this.dimensions;
    const { colors, majorTicks, minorTicks, minValue } = this.config;

    // Major ticks
    for (let i = 0; i <= majorTicks; i++) {
      const value = minValue + (i * (valueRange / majorTicks));
      const angle = this.valueToAngle(value - minValue, valueRange, startAngle, endAngle);
      
      const startPoint = this.polarToCartesian(centerX, centerY, radius * 0.85, angle);
      const endPoint = this.polarToCartesian(centerX, centerY, radius * 0.95, angle);

      this.ctx.beginPath();
      this.ctx.moveTo(startPoint.x, startPoint.y);
      this.ctx.lineTo(endPoint.x, endPoint.y);
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = colors.majorTicks;
      this.ctx.stroke();
    }

    // Minor ticks
    const minorTickCount = majorTicks * minorTicks;
    for (let i = 0; i <= minorTickCount; i++) {
      const value = minValue + (i * (valueRange / minorTickCount));
      const angle = this.valueToAngle(value - minValue, valueRange, startAngle, endAngle);
      
      const startPoint = this.polarToCartesian(centerX, centerY, radius * 0.88, angle);
      const endPoint = this.polarToCartesian(centerX, centerY, radius * 0.92, angle);

      this.ctx.beginPath();
      this.ctx.moveTo(startPoint.x, startPoint.y);
      this.ctx.lineTo(endPoint.x, endPoint.y);
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = colors.minorTicks;
      this.ctx.stroke();
    }
  }

  private drawNumbers(): void {
    const { centerX, centerY, radius, startAngle, endAngle, valueRange } = this.dimensions;
    const { colors, majorTicks, minValue } = this.config;

    this.ctx.font = `${radius * 0.12}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    this.ctx.fillStyle = colors.numbers;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let i = 0; i <= majorTicks; i++) {
      const value = minValue + (i * (valueRange / majorTicks));
      const angle = this.valueToAngle(value - minValue, valueRange, startAngle, endAngle);
      
      const point = this.polarToCartesian(centerX, centerY, radius * 0.75, angle);
      
      this.ctx.fillText(this.config.valueFormat(value), point.x, point.y);
    }
  }

  private drawTitle(): void {
    const { centerX, centerY, radius } = this.dimensions;
    const { colors, title } = this.config;

    if (!title) return;

    this.ctx.font = `${radius * 0.15}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    this.ctx.fillStyle = colors.title;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.fillText(title, centerX, centerY - radius * 0.6);
  }

  private drawUnits(): void {
    const { centerX, centerY, radius } = this.dimensions;
    const { colors, units } = this.config;

    if (!units) return;

    this.ctx.font = `${radius * 0.1}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    this.ctx.fillStyle = colors.units;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.fillText(units, centerX, centerY + radius * 0.6);
  }

  private drawNeedle(): void {
    const { centerX, centerY, radius, startAngle, endAngle, valueRange } = this.dimensions;
    const { colors, minValue } = this.config;

    const value = this.currentValue - minValue;
    const angle = this.valueToAngle(value, valueRange, startAngle, endAngle);

    // Create needle gradient
    const gradient = this.ctx.createLinearGradient(
      centerX - radius * 0.1,
      centerY - radius * 0.1,
      centerX + radius * 0.1,
      centerY + radius * 0.1
    );
    gradient.addColorStop(0, colors.needle.start);
    gradient.addColorStop(1, colors.needle.end);

    // Draw needle
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    
    const needleTip = this.polarToCartesian(centerX, centerY, radius * 0.8, angle);
    this.ctx.lineTo(needleTip.x, needleTip.y);
    
    this.ctx.lineWidth = radius * 0.05;
    this.ctx.strokeStyle = gradient;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    // Draw needle center
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius * 0.05, 0, Math.PI * 2);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawValueBox(): void {
    const { centerX, centerY, radius } = this.dimensions;
    const { colors } = this.config;

    const boxWidth = radius * 0.8;
    const boxHeight = radius * 0.3;
    const boxX = centerX - boxWidth / 2;
    const boxY = centerY + radius * 0.3;

    // Draw box background
    this.ctx.beginPath();
    this.ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
    this.ctx.fillStyle = colors.valueBox.background;
    this.ctx.fill();

    // Draw value text
    this.ctx.font = `${radius * 0.2}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    this.ctx.fillStyle = colors.valueBox.text;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.fillText(
      this.config.valueFormat(this.currentValue),
      centerX,
      boxY + boxHeight / 2
    );
  }

  private valueToAngle(
    value: number,
    valueRange: number,
    startAngle: number,
    endAngle: number
  ): number {
    const normalizedValue = Math.max(0, Math.min(valueRange, value)) / valueRange;
    const angleRange = endAngle - startAngle;
    return startAngle + (normalizedValue * angleRange);
  }

  private polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angle: number
  ): Point {
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  }
}
