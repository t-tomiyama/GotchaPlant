import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getAlertState, saveAlertState } from '@/storage/diagnosis-repository';

import { buildAlertContent, selectDueFindings } from './alert-policy';

import type { AlertState, PlantDiagnosis } from '@/types/diagnosis';
import type { PlantProfile } from '@/types/plant';

const CHANNEL_IDS = { critical: 'plant-critical', attention: 'plant-attention' } as const;
const BRAND_COLOR = '#4CAF50';

/** Show alerts as banners even while the app is open. Call once, at module scope. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Creates the Android channels and asks for permission. Channels come first:
 * Android 13+ only shows the permission prompt once a channel exists.
 */
export async function setupNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Promise.all([
        Notifications.setNotificationChannelAsync(CHANNEL_IDS.critical, {
          name: 'Alertas críticos das plantas',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E5484D',
        }),
        Notifications.setNotificationChannelAsync(CHANNEL_IDS.attention, {
          name: 'Avisos das plantas',
          importance: Notifications.AndroidImportance.DEFAULT,
        }),
      ]);
    }
    return await ensurePermission();
  } catch (e) {
    console.log('Erro ao configurar notificações:', e);
    return false;
  }
}

// One shared, in-memory copy per plant. Readings arrive every second while the
// storage read is still in flight; sharing the promise means the second call sees
// what the first one already marked, so a single problem sends a single notification.
const alertStates = new Map<string, Promise<AlertState>>();

function loadAlertState(plantId: string): Promise<AlertState> {
  let state = alertStates.get(plantId);
  if (!state) {
    state = getAlertState(plantId);
    alertStates.set(plantId, state);
  }
  return state;
}

/**
 * Sends a local notification if the diagnosis contains a critical or attention
 * finding that hasn't been notified recently. Only live readings notify: an
 * old saved reading says nothing about the plant's state right now.
 */
export async function notifyPlantDiagnosis(
  plant: PlantProfile,
  diagnosis: PlantDiagnosis,
  now: number = Date.now(),
): Promise<void> {
  if (diagnosis.source !== 'live' || diagnosis.severity === 'ok') return;

  try {
    const state = await loadAlertState(plant.id);
    const due = selectDueFindings(diagnosis.findings, state, now);
    if (due.length === 0) return;

    for (const finding of due) state[finding.id] = now;
    saveAlertState(plant.id, state);

    if (!(await ensurePermission())) return;

    const content = buildAlertContent(plant, due, diagnosis.findings.length);
    await Notifications.scheduleNotificationAsync({
      // Same identifier per plant: a new alert replaces the previous one instead of stacking.
      identifier: `plant-alert-${plant.id}`,
      content: {
        title: content.title,
        body: content.body,
        data: { plantId: plant.id, severity: content.severity },
        color: BRAND_COLOR,
        sound: 'default',
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_IDS[content.severity] } : null,
    });
  } catch (e) {
    console.log('Erro ao enviar notificação da planta:', e);
  }
}
