import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { diagnosePlant } from '@/services/diagnosis/plant-analyzer';
import { getHistory } from '@/storage/plant-repository';

import type { PlantDiagnosis } from '@/types/diagnosis';
import type { PlantProfile } from '@/types/plant';

/**
 * Diagnosis of each plant's last saved reading, for the home list. Recomputed
 * whenever the screen gains focus, so it reflects what a plant screen just saved.
 */
export function usePlantsHealth(plants: PlantProfile[]): Record<string, PlantDiagnosis> {
  const [health, setHealth] = useState<Record<string, PlantDiagnosis>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const entries = await Promise.all(
          plants.map(async (plant) => [plant.id, diagnosePlant({ plant, history: await getHistory(plant.id) })] as const),
        );
        if (!cancelled) setHealth(Object.fromEntries(entries));
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [plants]),
  );

  return health;
}
