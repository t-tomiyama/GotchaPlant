import { getJson, setJson } from './json-storage';
import { StorageKeys } from './storage-keys';

export async function getBackgroundMonitoringEnabled(): Promise<boolean> {
  return (await getJson<boolean>(StorageKeys.backgroundMonitoring)) ?? false;
}

export function setBackgroundMonitoringEnabled(enabled: boolean): Promise<void> {
  return setJson(StorageKeys.backgroundMonitoring, enabled);
}
