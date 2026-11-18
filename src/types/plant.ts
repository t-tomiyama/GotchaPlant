export type PlantCategory = 'tropical' | 'moderada' | 'suculenta';

export type SensorHistoryEntry = {
  timestamp: number;
  temp: number;
  moist: number;
  light: number;
};

export type PlantProfile = {
  id: string;
  name: string;
  category: PlantCategory;
  /** How often (ms) a new reading is appended to the plant's history. */
  saveInterval: number;
  /** BLE device identifier bound to this plant, or null until one is picked. */
  deviceId: string | null;
  deviceName: string | null;
  createdAt: number;
};
