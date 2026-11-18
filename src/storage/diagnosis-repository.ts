import { getJson, setJson } from './json-storage';
import { StorageKeys } from './storage-keys';

import type { AlertState, PlantAdvice } from '@/types/diagnosis';

export async function getAlertState(plantId: string): Promise<AlertState> {
  return (await getJson<AlertState>(StorageKeys.plantAlertState(plantId))) ?? {};
}

export function saveAlertState(plantId: string, state: AlertState): Promise<void> {
  return setJson(StorageKeys.plantAlertState(plantId), state);
}

export function getAdvice(plantId: string): Promise<PlantAdvice | null> {
  return getJson<PlantAdvice>(StorageKeys.plantAdvice(plantId));
}

export function saveAdvice(plantId: string, advice: PlantAdvice): Promise<void> {
  return setJson(StorageKeys.plantAdvice(plantId), advice);
}
