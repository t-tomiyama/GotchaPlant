import { initLlama, type LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';

import { AI_MODEL } from '@/constants/ai-model';
import { diagnosisSignature } from '@/services/diagnosis/plant-analyzer';

import { ADVICE_SCHEMA, buildAdvisorMessages, parseAdvice } from './advisor-prompt';

import type { PlantAdvice, PlantDiagnosis } from '@/types/diagnosis';
import type { PlantProfile, SensorHistoryEntry } from '@/types/plant';

const GENERATION_TIMEOUT_MS = 3 * 60_000;
const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>', '<|eot_id|>'];

export class AdviceCancelledError extends Error {
  constructor() {
    super('Análise cancelada.');
  }
}

// Only one model instance at a time: each holds ~1–2 GB of RAM, and the BLE
// session lives in this same process.
let running = false;

type AdviceInput = {
  plant: PlantProfile;
  diagnosis: PlantDiagnosis;
  history: SensorHistoryEntry[];
  modelUri: string;
  signal?: AbortSignal;
};

/**
 * Loads the on-device model, has it read the plant's locally stored history and
 * current alerts, and returns the written analysis. Nothing leaves the device.
 * The model is released afterwards so it doesn't keep the RAM.
 */
export async function generatePlantAdvice({
  plant,
  diagnosis,
  history,
  modelUri,
  signal,
}: AdviceInput): Promise<PlantAdvice> {
  if (running) throw new Error('Outra análise já está em andamento. Aguarde terminar.');
  if (signal?.aborted) throw new AdviceCancelledError();

  running = true;
  let context: LlamaContext | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    context?.stopCompletion().catch(() => {});
  };

  try {
    context = await initLlama({
      model: modelUri.replace(/^file:\/\//, ''),
      n_ctx: 2048,
      use_mlock: false,
      n_gpu_layers: Platform.OS === 'ios' ? 99 : 0,
    });
    if (signal?.aborted) throw new AdviceCancelledError();

    signal?.addEventListener('abort', stop);
    timeout = setTimeout(stop, GENERATION_TIMEOUT_MS);

    const result = await context.completion({
      messages: buildAdvisorMessages({ plant, diagnosis, history }),
      n_predict: 480,
      temperature: 0.3,
      top_p: 0.9,
      stop: STOP_WORDS,
      response_format: { type: 'json_schema', json_schema: { strict: true, schema: ADVICE_SCHEMA } },
    });

    if (signal?.aborted) throw new AdviceCancelledError();
    if (result.interrupted) throw new Error('A análise demorou demais e foi interrompida.');

    return {
      ...parseAdvice(result.content || result.text),
      generatedAt: Date.now(),
      basedOn: diagnosisSignature(diagnosis),
      modelId: AI_MODEL.id,
    };
  } finally {
    if (timeout) clearTimeout(timeout);
    signal?.removeEventListener('abort', stop);
    await context?.release().catch(() => {});
    running = false;
  }
}
