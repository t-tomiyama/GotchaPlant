/**
 * The pre-trained language model that runs on the device (via llama.rn).
 *
 * The weights are downloaded once from Hugging Face; no plant data is ever sent
 * anywhere — inference happens entirely on the phone. To try a different model,
 * change the fields below (any instruct GGUF works; keep sizeBytes exact, it is
 * used to detect truncated downloads).
 */
export const AI_MODEL = {
  id: 'qwen2.5-1.5b-instruct-q4_k_m',
  label: 'Qwen2.5 1.5B Instruct',
  fileName: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
  url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
  sizeBytes: 1117320736,
} as const;

export function formatModelSize(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(2).replace('.', ',')} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}
