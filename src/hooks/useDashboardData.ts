import { useState, useEffect, useCallback } from 'react';
import { useOBDSimulator } from '@/hooks/useOBDSimulator';
import { useBluetoothOBD } from '@/hooks/useBluetoothOBD';
import type { PanelProps } from '@/panels/types';

/**
 * Shared dashboard data controller.
 *
 * Owns all data acquisition (mock simulator + Bluetooth), the mock/live mode
 * flag, PID selection and connection handling. Any panel/theme in the registry
 * can be rendered against the exact same controller output, which keeps themes
 * interchangeable while the underlying telemetry keeps flowing uninterrupted
 * when a theme is changed.
 */
export function useDashboardData(): PanelProps {
  const [isMockMode, setIsMockMode] = useState(true);
  const [selectedPIDs, setSelectedPIDs] = useState<string[]>([
    '010C', // RPM
    '010D', // Speed
    '0104', // Engine Load
    '0105', // Coolant Temp
    '0111', // Throttle Position
    '012F', // Fuel Level
  ]);

  // Mock data simulator
  const mockData = useOBDSimulator(isMockMode, {
    drivingMode: 'city',
    maxRpm: 8000,
    updateInterval: 50,
  });

  // Real Bluetooth OBD data
  const {
    metrics: bluetoothData,
    connectionStatus,
    connectedDevice,
    error,
    isSupported,
    connect,
    disconnect,
  } = useBluetoothOBD({
    pidsToPoll: selectedPIDs,
    pollingInterval: 150,
  });

  // Use mock data when in mock mode, otherwise use Bluetooth data
  const metrics: PanelProps['metrics'] = isMockMode ? mockData : bluetoothData;

  // Auto-switch to mock mode if Bluetooth is not supported
  useEffect(() => {
    if (!isSupported && !isMockMode) {
      setIsMockMode(true);
    }
  }, [isSupported, isMockMode]);

  // Handle mock/live mode toggle
  const toggleMode = useCallback(() => {
    if (isMockMode) {
      // Switching from mock to real
      if (!isSupported) {
        alert('此浏览器不支持蓝牙接口，请使用桌面版谷歌浏览器或微软浏览器。');
        return;
      }
      setIsMockMode(false);
      void connect();
    } else {
      // Switching from real to mock
      setIsMockMode(true);
      disconnect();
    }
  }, [isMockMode, isSupported, connect, disconnect]);

  // Toggle a PID in the monitoring set
  const togglePID = useCallback((pid: string) => {
    setSelectedPIDs(prev =>
      prev.includes(pid)
        ? prev.filter(p => p !== pid)
        : [...prev, pid]
    );
  }, []);

  return {
    metrics,
    isMockMode,
    connectionStatus,
    connectedDevice,
    error,
    isSupported,
    selectedPIDs,
    togglePID,
    toggleMode,
  };
}
