import { useState, useEffect, useCallback, useRef } from 'react';
import { OBDMetrics, ConnectionStatus, BluetoothDeviceInfo } from '@/types/obd';
import { OBD_SERVICES, parseOBDResponse, ELM327_INIT_SEQUENCE, getPIDCommand } from '@/utils/obdParser';


interface BluetoothRequestDeviceFilter {
  namePrefix?: string;
}

export interface BluetoothOBDConfig {
  pollingInterval: number; // ms between PID requests
  pidsToPoll: string[];   // List of PIDs to request
  deviceFilters: BluetoothRequestDeviceFilter[];
  autoReconnect: boolean;
  maxReconnectAttempts: number;
}

const DEFAULT_CONFIG: BluetoothOBDConfig = {
  pollingInterval: 150, // Safe for ELM327 buffer
  pidsToPoll: ['010C', '010D', '0104', '0105', '0111', '012F'], // RPM, Speed, Load, Temp, Throttle, Fuel
  deviceFilters: [
    { namePrefix: 'OBD' },
    { namePrefix: 'ELM' },
    { namePrefix: 'Vgate' },
    { namePrefix: 'iCar' },
  ],
  autoReconnect: true,
  maxReconnectAttempts: 3,
};

export interface BluetoothOBDState {
  metrics: OBDMetrics;
  connectionStatus: ConnectionStatus;
  connectedDevice: BluetoothDeviceInfo | null;
  error: string | null;
  isSupported: boolean;
}

export function useBluetoothOBD(
  config: Partial<BluetoothOBDConfig> = {}
): BluetoothOBDState & {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendCommand: (command: string) => Promise<void>;
} {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<BluetoothOBDState>({
    metrics: {
      rpm: 0,
      speed: 0,
      engineLoad: 0,
      coolantTemp: 0,
      throttlePos: 0,
      fuelLevel: 0,
    },
    connectionStatus: 'disconnected',
    connectedDevice: null,
    error: null,
    isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
  });

  // Refs for Bluetooth objects
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const serviceRef = useRef<BluetoothRemoteGATTService | null>(null);
  const txCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const rxCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const disconnectRef = useRef<() => Promise<void>>(async () => {});
  const disconnectionRef = useRef<() => void>(() => {});
  const handleDisconnectEvent = useCallback(() => disconnectionRef.current(), []);
  const pollingBusyRef = useRef(false);

  // Update metrics helper
  const updateMetrics = useCallback((type: keyof OBDMetrics, value: number) => {
    setState((prev: BluetoothOBDState) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [type]: value,
      },
    }));
  }, []);

  // Handle incoming data from ELM327
  const handleIncomingData = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    
    if (!value) return;
    
    const decoder = new TextDecoder();
    const rawString = decoder.decode(value).trim();
    
    // Parse the OBD response
    const parsed = parseOBDResponse(rawString);
    
    if (parsed) {
      updateMetrics(parsed.type, parsed.value);
      
      // Log successful parsing (debug)
      console.debug(`OBD Response: ${parsed.type} = ${parsed.value} (${parsed.rawHex})`);
    } else if (rawString.length > 0 && !rawString.includes('>') && !rawString.includes('AT')) {
      // Log unparsed but potentially valid responses
      console.debug(`Unparsed OBD Response: "${rawString}"`);
    }
  }, [updateMetrics]);

  // Send command to ELM327
  const sendCommand = useCallback(async (command: string) => {
    if (!txCharRef.current) {
      throw new Error('尚未连接 ELM327');
    }
    
    const encoder = new TextEncoder();
    await txCharRef.current.writeValue(encoder.encode(command));
    
    console.debug(`Sent command: "${command.trim()}"`);
  }, []);

  // Initialize ELM327 adapter
  const initializeELM327 = useCallback(async () => {
    setState(prev => ({ ...prev, connectionStatus: 'initializing' }));
    
    try {
      // Run initialization sequence
      for (const cmd of ELM327_INIT_SEQUENCE) {
        await sendCommand(cmd);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between commands
      }
      
      console.log('ELM327 initialized successfully');
      return true;
    } catch (error) {
      console.error('ELM327 initialization failed:', error);
      setState(prev => ({ 
        ...prev, 
        connectionStatus: 'error',
        error: 'ELM327 初始化失败，请检查适配器连接。'
      }));
      return false;
    }
  }, [sendCommand]);

  // Start polling for PIDs
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = window.setInterval(async () => {
      if (pollingBusyRef.current) return;
      pollingBusyRef.current = true;
      try {
        // Send each PID command in sequence
        for (const pid of fullConfig.pidsToPoll) {
          await sendCommand(getPIDCommand(pid));
          await new Promise(resolve => setTimeout(resolve, 20)); // Small delay between PIDs
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Don't update state here to avoid rapid state changes
      } finally { pollingBusyRef.current = false; }
    }, fullConfig.pollingInterval);
  }, [fullConfig.pidsToPoll, fullConfig.pollingInterval, sendCommand]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Connect to Bluetooth device
  const connect = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ 
        ...prev, 
        connectionStatus: 'error',
        error: '此浏览器不支持蓝牙接口'
      }));
      return;
    }
    
    setState(prev => ({ ...prev, connectionStatus: 'scanning', error: null }));
    
    try {
      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: fullConfig.deviceFilters,
        optionalServices: [OBD_SERVICES.UART_SERVICE_UUID],
      });
      
      deviceRef.current = device;
      
      setState(prev => ({ 
        ...prev, 
        connectionStatus: 'connecting',
        connectedDevice: {
          id: device.id,
          name: device.name || '未知 OBD 设备',
          connected: false,
        }
      }));
      
      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');
      
      serverRef.current = server;
      
      // Get the UART service
      const service = await server.getPrimaryService(OBD_SERVICES.UART_SERVICE_UUID);
      serviceRef.current = service;
      
      // Get characteristics
      txCharRef.current = await service.getCharacteristic(OBD_SERVICES.TX_CHAR_UUID);
      rxCharRef.current = await service.getCharacteristic(OBD_SERVICES.RX_CHAR_UUID);
      
      // Start notifications on RX characteristic
      await rxCharRef.current.startNotifications();
      rxCharRef.current.addEventListener('characteristicvaluechanged', handleIncomingData);
      
      // Initialize ELM327
      const initialized = await initializeELM327();
      if (!initialized) {
        throw new Error('ELM327 initialization failed');
      }
      
      // Update connection state
      setState(prev => ({
        ...prev,
        connectionStatus: 'connected',
        connectedDevice: prev.connectedDevice ? { 
          ...prev.connectedDevice, 
          connected: true 
        } : null,
        error: null,
      }));
      
      reconnectAttemptsRef.current = 0;
      
      // Start polling for data
      startPolling();
      
      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', handleDisconnectEvent);
      
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle user cancellation gracefully
      if (errorMessage.includes('User cancelled')) {
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'disconnected',
          error: null,
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'error',
          error: '蓝牙连接失败，请检查设备与浏览器权限。',
        }));
      }
      
      // Clean up on error
      await disconnectRef.current();
    }
  }, [state.isSupported, fullConfig.deviceFilters, handleIncomingData, initializeELM327, startPolling, handleDisconnectEvent]);

  // Handle disconnection
  const handleDisconnection = useCallback(() => {
    stopPolling();
    
    setState(prev => ({
      ...prev,
      connectionStatus: 'disconnected',
      connectedDevice: prev.connectedDevice ? { 
        ...prev.connectedDevice, 
        connected: false 
      } : null,
    }));
    
    // Attempt reconnection if enabled
    if (fullConfig.autoReconnect && reconnectAttemptsRef.current < fullConfig.maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      console.log(`Attempting reconnection (${reconnectAttemptsRef.current}/${fullConfig.maxReconnectAttempts})...`);
      
      reconnectTimerRef.current = setTimeout(() => {
        if (deviceRef.current?.gatt) {
          void connectRef.current();
        }
      }, 2000 * reconnectAttemptsRef.current); // Exponential backoff
    }
  }, [fullConfig.autoReconnect, fullConfig.maxReconnectAttempts, stopPolling]);

  // Disconnect from Bluetooth device
  const disconnect = useCallback(async () => {
    stopPolling();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    deviceRef.current?.removeEventListener('gattserverdisconnected', handleDisconnectEvent);
    
    // Clean up event listeners
    if (rxCharRef.current) {
      rxCharRef.current.removeEventListener('characteristicvaluechanged', handleIncomingData);
    }
    
    // Disconnect from device
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    
    // Clear refs
    deviceRef.current = null;
    serverRef.current = null;
    serviceRef.current = null;
    txCharRef.current = null;
    rxCharRef.current = null;
    
    setState(prev => ({
      ...prev,
      connectionStatus: 'disconnected',
      connectedDevice: null,
      error: null,
    }));
    
    reconnectAttemptsRef.current = 0;
  }, [handleIncomingData, stopPolling, handleDisconnectEvent]);

  useEffect(() => {
    connectRef.current = connect;
    disconnectRef.current = disconnect;
    disconnectionRef.current = handleDisconnection;
  }, [connect, disconnect, handleDisconnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      deviceRef.current?.removeEventListener('gattserverdisconnected', handleDisconnectEvent);
      
      if (rxCharRef.current) {
        rxCharRef.current.removeEventListener('characteristicvaluechanged', handleIncomingData);
      }
      
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, [stopPolling, handleIncomingData, handleDisconnectEvent]);

  return {
    ...state,
    connect,
    disconnect,
    sendCommand,
  };
}

// Utility function to check Web Bluetooth support
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

// Utility function to get available Bluetooth devices
  export async function getAvailableBluetoothDevices(): Promise<BluetoothDeviceInfo[]> {
    if (!isWebBluetoothSupported()) {
      return [];
    }
    
    try {
      // Note: This requires user gesture and will show device picker
      const device = await navigator.bluetooth.requestDevice({
        filters: [], // Empty filters to show all devices
        optionalServices: [],
      });
      
      return [{
        id: device.id,
        name: device.name || '未知设备',
        connected: device.gatt?.connected || false,
      }];
    } catch (error) {
      console.error('Failed to get Bluetooth devices:', error);
      return [];
    }
  }
