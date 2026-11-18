import { getJson, removeItem, setJson } from './json-storage';
import { StorageKeys } from './storage-keys';

import type { PlantProfile, SensorHistoryEntry } from '@/types/plant';

/**
 * Entries kept per plant. Much larger than the dashboard chart (see
 * CHART_HISTORY_POINTS) so the diagnosis can look at trends, not just the
 * last few samples: 288 entries = ~5 h at 1 min, 6 days at 30 min, 24 days at 2 h.
 */
const HISTORY_LIMIT = 288;

export function createPlantId(): string {
  return `plant_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

async function getPlantIndex(): Promise<string[]> {
  return (await getJson<string[]>(StorageKeys.plantsIndex)) ?? [];
}

function savePlantIndex(ids: string[]): Promise<void> {
  return setJson(StorageKeys.plantsIndex, ids);
}

export function getPlant(id: string): Promise<PlantProfile | null> {
  return getJson<PlantProfile>(StorageKeys.plantProfile(id));
}

export async function listPlants(): Promise<PlantProfile[]> {
  const ids = await getPlantIndex();
  const plants = await Promise.all(ids.map((id) => getPlant(id)));
  return plants.filter((plant): plant is PlantProfile => plant !== null);
}

export async function savePlant(plant: PlantProfile): Promise<void> {
  const ids = await getPlantIndex();
  if (!ids.includes(plant.id)) {
    await savePlantIndex([...ids, plant.id]);
  }
  await setJson(StorageKeys.plantProfile(plant.id), plant);
}

export async function deletePlant(id: string): Promise<void> {
  const ids = await getPlantIndex();
  await savePlantIndex(ids.filter((existingId) => existingId !== id));
  await removeItem(StorageKeys.plantProfile(id));
  await removeItem(StorageKeys.plantHistory(id));
  await removeItem(StorageKeys.plantAlertState(id));
  await removeItem(StorageKeys.plantAdvice(id));
}

export async function getHistory(id: string): Promise<SensorHistoryEntry[]> {
  return (await getJson<SensorHistoryEntry[]>(StorageKeys.plantHistory(id))) ?? [];
}

export async function appendHistoryEntry(
  id: string,
  entry: SensorHistoryEntry,
): Promise<SensorHistoryEntry[]> {
  const history = await getHistory(id);
  const updated = [...history, entry].slice(-HISTORY_LIMIT);
  await setJson(StorageKeys.plantHistory(id), updated);
  return updated;
}

/**
 * One-time migration from the single-plant storage keys used before
 * multi-plant support existed, so upgrading installs don't lose their data.
 * Safe to call on every app start: it's a no-op once a plant index exists.
 */
export async function migrateLegacyPlant(): Promise<void> {
  const existingIds = await getPlantIndex();
  if (existingIds.length > 0) return;

  const legacyProfile = await getJson<{
    name: string;
    category: PlantProfile['category'];
    interval: number;
  }>(StorageKeys.legacyPlantProfile);
  if (!legacyProfile) return;

  const legacyHistory =
    (await getJson<SensorHistoryEntry[]>(StorageKeys.legacyPlantHistory)) ?? [];

  const id = createPlantId();
  await savePlant({
    id,
    name: legacyProfile.name,
    category: legacyProfile.category,
    saveInterval: legacyProfile.interval,
    deviceId: null,
    deviceName: null,
    createdAt: Date.now(),
  });
  if (legacyHistory.length > 0) {
    await setJson(StorageKeys.plantHistory(id), legacyHistory);
  }

  await removeItem(StorageKeys.legacyPlantProfile);
  await removeItem(StorageKeys.legacyPlantHistory);
}
