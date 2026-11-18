import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';

import {
  isBackgroundMonitorRunning,
  startBackgroundMonitor,
  stopBackgroundMonitor,
} from '@/services/background/plant-background-monitor';
import { plantBleService } from '@/services/ble/plant-ble-service';
import { setupNotifications } from '@/services/notifications/plant-notifications';
import { getBackgroundMonitoringEnabled, setBackgroundMonitoringEnabled } from '@/storage/settings-repository';

// Shared by the launch auto-start and the Profile switch, so the switch shows the
// user's choice even while the service is still starting (or was started before
// the Profile tab mounted).
let enabledState: boolean | null = null;
const listeners = new Set<() => void>();

function setEnabledState(next: boolean) {
  enabledState = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function loadEnabledState(): Promise<boolean> {
  if (enabledState === null) setEnabledState(await getBackgroundMonitoringEnabled());
  return enabledState ?? false;
}

/** Restarts the background monitor on app launch when the user left it on. */
export function useBackgroundMonitorAutostart(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    loadEnabledState().then(async (on) => {
      if (!on || isBackgroundMonitorRunning()) return;
      // Fails only if the Bluetooth permission was revoked meanwhile: turn the setting off.
      if (!(await startBackgroundMonitor())) {
        await setBackgroundMonitoringEnabled(false);
        setEnabledState(false);
      }
    });
  }, [enabled]);
}

/** State + toggle for the "monitoramento em segundo plano" setting in the Profile tab. */
export function useBackgroundMonitor() {
  const enabled = useSyncExternalStore(subscribe, () => enabledState ?? false);
  const [busy, setBusy] = useState(true);
  // Shown while a toggle is in progress, so the switch doesn't jump back during permission prompts.
  const [pending, setPending] = useState<boolean | null>(null);

  useEffect(() => {
    loadEnabledState().then(() => setBusy(false));
  }, []);

  const toggle = useCallback(async (next: boolean) => {
    setBusy(true);
    setPending(next);
    try {
      if (next) {
        const bluetoothAllowed = await plantBleService.requestConnectPermission();
        await setupNotifications();
        if (!bluetoothAllowed || !(await startBackgroundMonitor())) {
          Alert.alert(
            'Permissão necessária',
            'Para monitorar em segundo plano, permita o acesso a "Dispositivos próximos" (Bluetooth) nas configurações do app.',
          );
          return;
        }
      } else {
        await stopBackgroundMonitor();
      }
      await setBackgroundMonitoringEnabled(next);
      setEnabledState(next);
    } finally {
      setPending(null);
      setBusy(false);
    }
  }, []);

  return { enabled: pending ?? enabled, busy, toggle };
}
