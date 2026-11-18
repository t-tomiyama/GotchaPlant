import BackgroundService from 'react-native-background-actions';

import { plantBleService } from '@/services/ble/plant-ble-service';
import { diagnosePlant } from '@/services/diagnosis/plant-analyzer';
import { notifyPlantDiagnosis } from '@/services/notifications/plant-notifications';
import { appendHistoryEntry, getHistory, listPlants } from '@/storage/plant-repository';

import { isReadingDue, retryDelay } from './reading-schedule';

import type { PlantProfile, SensorHistoryEntry } from '@/types/plant';

/** How often the loop wakes up. Shorter save intervals than this behave like this in the background. */
export const BACKGROUND_TICK_MS = 60_000;

const TASK_OPTIONS = {
  taskName: 'GotchaPlantMonitor',
  taskTitle: '🌱 GotchaPlant',
  taskDesc: 'Monitorando suas plantas',
  taskIcon: { name: 'notification_icon', type: 'drawable' },
  color: '#4CAF50',
  linkingURI: 'gotchaplant://',
  foregroundServiceType: ['connectedDevice' as const],
};

type RetryState = { failures: number; nextAttemptAt: number };

// Per device: plants out of range are retried with a growing delay instead of every minute.
const retries = new Map<string, RetryState>();

// Text shown in the persistent notification; only updated when it changes.
let statusText = TASK_OPTIONS.taskDesc;

async function setStatus(text: string): Promise<void> {
  if (text === statusText) return;
  statusText = text;
  await BackgroundService.updateNotification({ taskDesc: text });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * One plant: reads only when its save interval has passed (and the phone is near
 * the plant, i.e. the connection succeeds). Returns true if a reading was saved.
 */
async function checkPlant(plant: PlantProfile, now: number): Promise<boolean> {
  const deviceId = plant.deviceId;
  if (!deviceId || plantBleService.isInUse(deviceId)) return false;

  const history = await getHistory(plant.id);
  if (!isReadingDue(history.at(-1)?.timestamp ?? null, plant.saveInterval, now)) return false;

  const retry = retries.get(deviceId);
  if (retry && now < retry.nextAttemptAt) return false;

  try {
    const reading = await plantBleService.readOnce(deviceId);
    retries.delete(deviceId);

    const savedAt = Date.now();
    const entry: SensorHistoryEntry = {
      timestamp: savedAt,
      temp: reading.temperatura,
      moist: reading.umidade_solo,
      light: reading.luminosidade,
    };
    const updated = await appendHistoryEntry(plant.id, entry);
    const diagnosis = diagnosePlant({
      plant,
      history: updated,
      liveReading: { temp: entry.temp, moist: entry.moist, light: entry.light },
      now: savedAt,
    });
    await notifyPlantDiagnosis(plant, diagnosis, savedAt);
    return true;
  } catch (e) {
    // Most often: plant out of range. Try again later, backing off.
    const failures = (retry?.failures ?? 0) + 1;
    retries.set(deviceId, { failures, nextAttemptAt: Date.now() + retryDelay(failures) });
    console.log(`[monitor] ${plant.name}: leitura não feita (${failures}x):`, e instanceof Error ? e.message : e);
    return false;
  }
}

async function runCycle(): Promise<void> {
  const plants = (await listPlants()).filter((plant) => plant.deviceId);
  if (plants.length === 0) return;
  if (!(await plantBleService.isBluetoothOn())) {
    await setStatus('Bluetooth desligado — monitoramento pausado');
    return;
  }
  if (statusText.startsWith('Bluetooth desligado')) await setStatus(TASK_OPTIONS.taskDesc);

  const now = Date.now();
  for (const plant of plants) {
    try {
      if (await checkPlant(plant, now)) {
        await setStatus(`Última leitura: ${plant.name} às ${formatTime(Date.now())}`);
      }
    } catch (e) {
      console.log(`[monitor] erro em ${plant.name}:`, e);
    }
  }
}

async function monitorLoop(): Promise<void> {
  while (BackgroundService.isRunning()) {
    try {
      await runCycle();
    } catch (e) {
      console.log('[monitor] erro no ciclo:', e);
    }
    await sleep(BACKGROUND_TICK_MS);
  }
}

export function isBackgroundMonitorRunning(): boolean {
  return BackgroundService.isRunning();
}

/**
 * Starts the foreground service (persistent notification). Needs the Bluetooth
 * connect permission first: Android refuses a "connectedDevice" service without it.
 */
export async function startBackgroundMonitor(): Promise<boolean> {
  if (BackgroundService.isRunning()) return true;
  if (!(await plantBleService.hasConnectPermission())) return false;
  retries.clear();
  statusText = TASK_OPTIONS.taskDesc;
  await BackgroundService.start(monitorLoop, TASK_OPTIONS);
  return true;
}

export async function stopBackgroundMonitor(): Promise<void> {
  if (BackgroundService.isRunning()) await BackgroundService.stop();
}
