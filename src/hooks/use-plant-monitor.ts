import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isReadingDue } from '@/services/background/reading-schedule';
import { plantBleService, type SensorReading } from '@/services/ble/plant-ble-service';
import { diagnosePlant, medianSnapshot } from '@/services/diagnosis/plant-analyzer';
import { notifyPlantDiagnosis } from '@/services/notifications/plant-notifications';
import { appendHistoryEntry, getHistory, getPlant, savePlant } from '@/storage/plant-repository';

import type { SensorSnapshot } from '@/types/diagnosis';
import type { PlantProfile, SensorHistoryEntry } from '@/types/plant';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

/** The diagnosis uses the median of the last few live readings, so one noisy sample can't raise an alarm. */
const LIVE_SMOOTHING_WINDOW = 3;
const MIN_LIVE_SAMPLES = 2;

/**
 * Owns one plant's data + BLE connection lifecycle for the monitor screen.
 * UI (WebView wiring, buttons) stays in the screen component; this hook only
 * exposes state and intent-based actions.
 */
export function usePlantMonitor(plantId: string) {
  const [plant, setPlant] = useState<PlantProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState<SensorHistoryEntry[]>([]);
  const [liveReading, setLiveReading] = useState<SensorReading | null>(null);
  const [recentLive, setRecentLive] = useState<SensorSnapshot[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');

  // Last saved reading (from storage), so reconnecting doesn't save again before the interval is up.
  const lastSavedAtRef = useRef<number | null>(null);
  const connectedDeviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [loadedPlant, loadedHistory] = await Promise.all([
        getPlant(plantId),
        getHistory(plantId),
      ]);
      if (cancelled) return;
      setPlant(loadedPlant);
      setHistory(loadedHistory);
      lastSavedAtRef.current = loadedHistory.at(-1)?.timestamp ?? null;
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [plantId]);

  useEffect(() => {
    return () => {
      plantBleService.stopScan();
      if (connectedDeviceIdRef.current) {
        plantBleService.disconnectDevice(connectedDeviceIdRef.current);
      }
    };
  }, []);

  const bindDevice = useCallback(async (deviceId: string, deviceName: string | null) => {
    setPlant((current) => {
      if (!current) return current;
      const updated: PlantProfile = { ...current, deviceId, deviceName };
      savePlant(updated);
      return updated;
    });
  }, []);

  const startMonitoring = useCallback(
    async (deviceId: string) => {
      setConnectionState('connecting');
      try {
        await plantBleService.requestPermissions();
        const device = await plantBleService.connectToDevice(deviceId);
        connectedDeviceIdRef.current = device.id;
        setConnectionState('connected');

        plantBleService.monitorSensorData(
          device,
          async (reading) => {
            setLiveReading(reading);
            setRecentLive((previous) =>
              [
                ...previous,
                { temp: reading.temperatura, moist: reading.umidade_solo, light: reading.luminosidade },
              ].slice(-LIVE_SMOOTHING_WINDOW),
            );

            const now = Date.now();
            if (isReadingDue(lastSavedAtRef.current, plant?.saveInterval ?? 60000, now)) {
              lastSavedAtRef.current = now;
              const entry: SensorHistoryEntry = {
                timestamp: now,
                temp: reading.temperatura,
                moist: reading.umidade_solo,
                light: reading.luminosidade,
              };
              const updatedHistory = await appendHistoryEntry(plantId, entry);
              setHistory(updatedHistory);
            }
          },
          () => {
            setRecentLive([]);
            setConnectionState('error');
          },
        );
      } catch (e) {
        console.log('Erro de conexão BLE:', e);
        setConnectionState('error');
      }
    },
    [plant, plantId],
  );

  const connect = useCallback(async () => {
    if (!plant?.deviceId) return;
    await startMonitoring(plant.deviceId);
  }, [plant, startMonitoring]);

  const connectAndBind = useCallback(
    async (deviceId: string, deviceName: string | null) => {
      await bindDevice(deviceId, deviceName);
      await startMonitoring(deviceId);
    },
    [bindDevice, startMonitoring],
  );

  const disconnect = useCallback(async () => {
    if (connectedDeviceIdRef.current) {
      await plantBleService.disconnectDevice(connectedDeviceIdRef.current);
      connectedDeviceIdRef.current = null;
    }
    setRecentLive([]);
    setConnectionState('idle');
  }, []);

  // Without a live sensor the diagnosis falls back to the last saved reading.
  const diagnosis = useMemo(() => {
    if (!plant) return null;
    const liveSnapshot = recentLive.length >= MIN_LIVE_SAMPLES ? medianSnapshot(recentLive) : null;
    return diagnosePlant({ plant, liveReading: liveSnapshot, history });
  }, [plant, recentLive, history]);

  useEffect(() => {
    if (plant && diagnosis) void notifyPlantDiagnosis(plant, diagnosis);
  }, [plant, diagnosis]);

  return {
    plant,
    loaded,
    history,
    liveReading,
    diagnosis,
    connectionState,
    connect,
    connectAndBind,
    disconnect,
  };
}
