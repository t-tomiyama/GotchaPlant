import type { PlantCategory } from '@/types/plant';

export type Range = {
  idealMin: number;
  idealMax: number;
  /** Below this the plant is in danger, not just outside its comfort zone. */
  criticalMin: number;
  criticalMax: number;
};

export type CareProfile = {
  temp: Range;
  moist: Range;
  /** Daytime light range in lx. Night-time darkness is normal and never flagged. */
  light: { min: number; max: number };
  /** Species-level context handed to the on-device model. */
  description: string;
  /** Appended to every "water it" suggestion. */
  wateringTip: string;
};

/**
 * Care ranges per plant category — the single source of truth for the analyzer
 * and for the prompt given to the on-device model.
 *
 * The ideal ranges (temp, moist) and the light limits mirror PLANT_THRESHOLDS in
 * index.html so the dashboard mood and the alerts agree. The critical limits and
 * light max for succulents are defaults chosen for typical houseplants; tune them
 * against your sensor's calibration.
 */
export const CARE_PROFILES: Record<PlantCategory, CareProfile> = {
  tropical: {
    temp: { idealMin: 20, idealMax: 32, criticalMin: 12, criticalMax: 38 },
    moist: { idealMin: 50, idealMax: 90, criticalMin: 30, criticalMax: 95 },
    light: { min: 100, max: 600 },
    description:
      'Planta tropical de folhagem: gosta de calor constante, solo sempre levemente úmido e luz clara indireta. Sofre com frio, correntes de ar e solo seco por vários dias.',
    wateringTip: 'Molhe até o solo ficar úmido, sem deixar água parada no prato.',
  },
  moderada: {
    temp: { idealMin: 15, idealMax: 30, criticalMin: 8, criticalMax: 36 },
    moist: { idealMin: 30, idealMax: 80, criticalMin: 15, criticalMax: 92 },
    light: { min: 100, max: 600 },
    description:
      'Planta de clima ameno e necessidade de água moderada: prefere solo úmido sem encharcar, temperaturas amenas e luz clara.',
    wateringTip: 'Molhe até o solo ficar úmido, sem encharcar.',
  },
  suculenta: {
    temp: { idealMin: 15, idealMax: 35, criticalMin: 5, criticalMax: 42 },
    moist: { idealMin: 10, idealMax: 40, criticalMin: 3, criticalMax: 65 },
    light: { min: 100, max: 1000 },
    description:
      'Suculenta ou cacto: armazena água, prefere solo seco entre as regas, muita luz e boa drenagem. O maior risco é o excesso de água, que apodrece as raízes.',
    wateringTip: 'Use pouca água e devagar; suculentas preferem o solo seco entre as regas.',
  },
};
