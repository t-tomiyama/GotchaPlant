import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Device } from 'react-native-ble-plx';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Garden } from '@/constants/garden';
import { Spacing } from '@/constants/theme';
import { plantBleService } from '@/services/ble/plant-ble-service';

type BleDevicePickerProps = {
  selectedDeviceId: string | null;
  onSelect: (deviceId: string, deviceName: string | null) => void;
};

export function BleDevicePicker({ selectedDeviceId, onSelect }: BleDevicePickerProps) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  const stopScan = useCallback(() => {
    plantBleService.stopScan();
    setScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    setDevices([]);
    setScanning(true);
    await plantBleService.requestPermissions();
    plantBleService.scanForDevices(
      (device) => {
        setDevices((current) =>
          current.some((existing) => existing.id === device.id) ? current : [...current, device],
        );
      },
      () => setScanning(false),
    );
  }, []);

  useEffect(() => stopScan, [stopScan]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={scanning ? stopScan : startScan}>
        <View style={styles.scanButton}>
          {scanning ? <ActivityIndicator color={Garden.green} /> : null}
          <ThemedText type="smallBold" style={styles.scanLabel}>
            {scanning ? 'Procurando...' : 'Procurar dispositivo'}
          </ThemedText>
        </View>
      </TouchableOpacity>

      {devices.map((device) => {
        const selected = device.id === selectedDeviceId;
        return (
          <TouchableOpacity
            key={device.id}
            onPress={() => {
              stopScan();
              onSelect(device.id, device.name ?? null);
            }}>
            <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.deviceRow}>
              <ThemedText type="small">{device.name ?? device.id}</ThemedText>
              {selected ? <ThemedText>✓</ThemedText> : null}
            </ThemedView>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  scanButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    backgroundColor: Garden.greenSoft,
    borderWidth: 1,
    borderColor: Garden.hillBack,
  },
  scanLabel: { color: Garden.greenDark, fontWeight: '900' },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
