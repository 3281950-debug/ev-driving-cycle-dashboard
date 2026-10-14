# 🚗 Web OBD-II Dashboard

A high-performance React web/desktop instrument panel that connects to ELM327 Bluetooth OBD-II adapters via Web Bluetooth API. Features realistic mock data simulation and canvas-based gauges for smooth 60fps rendering.

![OBD-II Dashboard](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![Web Bluetooth](https://img.shields.io/badge/Web%20Bluetooth-API-green)

## ✨ Features

- **Real-time OBD-II Telemetry**: Connect to ELM327 Bluetooth adapters via Web Bluetooth API
- **Advanced Mock Simulator**: Realistic driving simulation with multiple modes (idle, city, highway, track)
- **High-Performance Gauges**: Canvas-based rendering for smooth 60fps animations
- **Responsive Dashboard**: Modern automotive UI with dark theme
- **PID Selection**: Customize which parameters to monitor
- **Cross-Browser Support**: Chrome/Edge with Web Bluetooth API

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Chrome/Edge browser (Web Bluetooth support)
- ELM327 Bluetooth OBD-II adapter (optional, for real data)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Open in browser:**
```
http://localhost:5173
```

## 📊 Supported OBD-II PIDs

| PID | Parameter | Range | Unit |
|-----|-----------|-------|------|
| 010C | Engine RPM | 0-16,383 | RPM |
| 010D | Vehicle Speed | 0-255 | km/h |
| 0104 | Engine Load | 0-100 | % |
| 0105 | Coolant Temperature | -40 to +215 | °C |
| 0111 | Throttle Position | 0-100 | % |
| 012F | Fuel Level | 0-100 | % |
| 010F | Intake Air Temperature | -40 to +215 | °C |
| 0110 | Mass Air Flow | 0-655.35 | g/s |
| 010E | Timing Advance | -64 to +63.5 | ° |
| 0142 | Control Module Voltage | 0-65.535 | V |

## 🎮 Usage

### Mock Mode (Default)
- Automatically starts with realistic simulated driving data
- Cycles through driving modes: Idle → City → Highway → Track
- Includes automatic gear shifting simulation
- Perfect for development and testing

### Bluetooth Mode
1. Click **"Connect Bluetooth OBD-II"** button
2. Select your ELM327 adapter from the device list
3. The dashboard will automatically:
   - Connect to the Bluetooth device
   - Initialize ELM327 protocol
   - Start polling selected PIDs
   - Display real-time vehicle data

### Customizing PIDs
- Use the PID selection panel at the bottom
- Toggle individual PIDs on/off
- Changes apply immediately to both mock and real modes

## 🛠️ Technical Architecture

### Core Components
- **`useOBDSimulator`**: Advanced mock data generator with state machine
- **`useBluetoothOBD`**: Robust Web Bluetooth connection manager
- **`obdParser`**: Hexadecimal PID calculation matrix
- **`GaugeCanvas`**: High-performance canvas rendering engine

### Key Technologies
- **React 19.2** with TypeScript
- **Vite** for fast builds and HMR
- **Canvas API** for 60fps gauge rendering
- **Web Bluetooth API** for ELM327 communication
- **Tailwind CSS** for responsive styling
- **Lucide React** for modern icons

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
│   ├── Gauge/         # Canvas gauge system
│   └── OBDDashboard/  # Main dashboard
├── hooks/             # Custom React hooks
│   ├── useOBDSimulator.ts
│   └── useBluetoothOBD.ts
├── utils/             # Utility functions
│   └── obdParser.ts   # PID parsing engine
├── types/             # TypeScript definitions
│   └── obd.ts         # OBD interfaces
└── App.tsx            # Root component
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🌐 Browser Compatibility

| Browser | Web Bluetooth | Status |
|---------|---------------|--------|
| Chrome 89+ | ✅ Full support | Recommended |
| Edge 89+ | ✅ Full support | Recommended |
| Firefox | ⚠️ Experimental flag | Limited |
| Safari | ❌ Not supported | Use mock mode |

### Requirements for Bluetooth Mode
- **HTTPS or localhost** (Web Bluetooth security requirement)
- **User gesture** (click/tap) to initiate connection
- **Chrome/Edge browser** on desktop

## 🎨 Customization

### Gauge Themes
Modify gauge colors and styles in `src/components/Gauge/Gauge.tsx`:
```typescript
colors: {
  plate: '#222',
  zones: [
    { from: 0, to: 50, color: '#00ff00' },
    { from: 50, to: 80, color: '#ffff00' },
    { from: 80, to: 100, color: '#ff0000' },
  ],
}
```

### Driving Simulation
Adjust simulation parameters in `src/hooks/useOBDSimulator.ts`:
```typescript
const DEFAULT_CONFIG: SimulatorConfig = {
  updateInterval: 50,      // 20Hz updates
  drivingMode: 'city',     // Initial mode
  maxRpm: 8000,           // Maximum RPM
  gearRatios: [3.5, 2.0, 1.5, 1.2, 1.0, 0.8],
};
```

## 🔧 Troubleshooting

### Bluetooth Connection Issues
1. **Ensure HTTPS/localhost**: Web Bluetooth requires secure context
2. **Check browser compatibility**: Use Chrome/Edge on desktop
3. **Verify adapter compatibility**: Most ELM327 Bluetooth adapters work
4. **Enable Bluetooth**: Ensure system Bluetooth is enabled

### Mock Data Issues
- Mock mode starts automatically if Web Bluetooth is unsupported
- Driving modes cycle every 30 seconds
- Gear shifting logic is based on RPM thresholds

### Performance Issues
- Canvas rendering optimized for 60fps
- Use Chrome DevTools Performance tab for profiling
- Reduce polling interval for slower devices

## 📈 Roadmap

- [ ] **Advanced Diagnostics**: DTC code reading and clearing
- [ ] **Trip Computer**: Fuel economy, distance, trip time
- [ ] **Data Logging**: Export telemetry to CSV/JSON
- [ ] **Mobile Support**: Progressive Web App (PWA) features
- [ ] **Themes**: Light mode and custom color schemes
- [ ] **Multi-Vehicle Support**: Save profiles for different vehicles

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ELM327 Protocol**: Standard OBD-II communication protocol
- **Web Bluetooth API**: Enables browser-based Bluetooth communication
- **React Team**: For the amazing framework
- **Canvas API**: For high-performance rendering

## 📞 Support

For issues, questions, or feature requests:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Open a [GitHub Issue](https://github.com/yourusername/obd-react-panel/issues)
3. Provide detailed information about your setup

---

**Built with ❤️ for automotive enthusiasts and developers**
