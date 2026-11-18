import { useCallback, useEffect, useState } from 'react';

import { createPlantId, deletePlant, listPlants, savePlant } from '@/storage/plant-repository';

import type { PlantProfile } from '@/types/plant';

export function usePlants() {
  const [plants, setPlants] = useState<PlantProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const loaded = await listPlants();
    setPlants(loaded.sort((a, b) => a.createdAt - b.createdAt));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPlant = useCallback(
    async (input: Omit<PlantProfile, 'id' | 'createdAt'>) => {
      const plant: PlantProfile = { ...input, id: createPlantId(), createdAt: Date.now() };
      await savePlant(plant);
      await refresh();
      return plant;
    },
    [refresh],
  );

  const removePlant = useCallback(
    async (id: string) => {
      await deletePlant(id);
      await refresh();
    },
    [refresh],
  );

  return { plants, loading, addPlant, removePlant, refresh };
}
