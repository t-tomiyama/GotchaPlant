import { useCallback, useEffect, useRef, useState } from 'react';

import { AdviceCancelledError, generatePlantAdvice } from '@/services/ai/plant-advisor';
import { diagnosisSignature } from '@/services/diagnosis/plant-analyzer';
import { getAdvice, saveAdvice } from '@/storage/diagnosis-repository';

import { useLocalModel } from './use-local-model';

import type { PlantAdvice, PlantDiagnosis } from '@/types/diagnosis';
import type { PlantProfile, SensorHistoryEntry } from '@/types/plant';

export type AdvisorStatus = 'idle' | 'generating' | 'error';

type Options = {
  plant: PlantProfile | null;
  history: SensorHistoryEntry[];
  diagnosis: PlantDiagnosis | null;
  /**
   * True while the analysis is on screen. Being active makes the advisor
   * write a fresh analysis when there is none (or the situation changed), and
   * leaving cancels one in progress — the model is heavy, so it only works
   * while someone is looking.
   */
  active: boolean;
};

export function usePlantAdvisor({ plant, history, diagnosis, active }: Options) {
  const { state: model, download, cancel: cancelDownload, remove } = useLocalModel();
  const [advice, setAdvice] = useState<PlantAdvice | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [status, setStatus] = useState<AdvisorStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const attemptedRef = useRef<string | null>(null);

  const plantId = plant?.id;
  useEffect(() => {
    if (!plantId) return;
    let cancelled = false;
    setCacheLoaded(false);
    getAdvice(plantId).then((cached) => {
      if (cancelled) return;
      setAdvice(cached);
      setCacheLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [plantId]);

  const signature = diagnosis ? diagnosisSignature(diagnosis) : null;
  const stale = advice !== null && signature !== null && advice.basedOn !== signature;

  const generate = useCallback(async () => {
    if (!plant || !diagnosis || model.status !== 'ready' || abortRef.current) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('generating');
    setError(null);
    try {
      const result = await generatePlantAdvice({
        plant,
        diagnosis,
        history,
        modelUri: model.uri,
        signal: controller.signal,
      });
      await saveAdvice(plant.id, result);
      setAdvice(result);
      setStatus('idle');
    } catch (e) {
      if (e instanceof AdviceCancelledError) {
        setStatus('idle');
      } else {
        console.log('Erro ao gerar análise local:', e);
        setError(e instanceof Error ? e.message : 'Não foi possível gerar a análise.');
        setStatus('error');
      }
    } finally {
      abortRef.current = null;
    }
  }, [plant, diagnosis, history, model]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  useEffect(() => {
    if (active) return;
    attemptedRef.current = null;
    abortRef.current?.abort();
  }, [active]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!active || !cacheLoaded || model.status !== 'ready' || status !== 'idle') return;
    if (!diagnosis || diagnosis.source === 'none' || signature === null) return;
    if (advice && !stale) return;
    if (attemptedRef.current === signature) return;
    attemptedRef.current = signature;
    void generate();
  }, [active, cacheLoaded, model.status, status, diagnosis, signature, advice, stale, generate]);

  return { model, download, cancelDownload, removeModel: remove, advice, stale, status, error, generate, cancel };
}
