import { CARE_PROFILES } from '@/constants/plant-care';
import { SEVERITY_META } from '@/constants/severity';
import { summarizeHistory } from '@/services/diagnosis/plant-analyzer';
import { formatAge } from '@/utils/format-age';

import type { HistoryStats, MetricStats, PlantDiagnosis } from '@/types/diagnosis';
import type { PlantProfile, SensorHistoryEntry } from '@/types/plant';

export type AdviceBody = {
  diagnosis: string;
  suggestions: string[];
  warnings: string[];
};

/** Constrains the model's output to this shape (llama.cpp turns it into a grammar). */
export const ADVICE_SCHEMA = {
  type: 'object',
  properties: {
    diagnostico: { type: 'string', maxLength: 260 },
    sugestoes: { type: 'array', items: { type: 'string', maxLength: 160 }, maxItems: 3 },
    avisos: { type: 'array', items: { type: 'string', maxLength: 160 }, maxItems: 2 },
  },
  required: ['diagnostico', 'sugestoes', 'avisos'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  'Você é o assistente de cuidados do app GotchaPlant e analisa dados de sensores de UMA planta de vaso.',
  'Responda sempre em português do Brasil, de forma curta, prática e amigável.',
  'Use somente os dados fornecidos e nunca invente medições.',
  'Os ALERTAS foram calculados por regras confiáveis do sistema: seu diagnóstico e suas sugestões devem ser coerentes com eles.',
  'Não recomende produtos, adubos ou medicamentos.',
  'Responda apenas com o JSON pedido.',
].join(' ');

const TASK_PROMPT =
  'Tarefa: escreva o diagnóstico da planta em até 2 frases; até 3 sugestões práticas, da mais urgente para a menos urgente; ' +
  'e até 2 avisos sobre os riscos se nada for feito. Se não houver alertas, diga que a planta está bem, ' +
  'use as sugestões para dicas de manutenção e deixe "avisos" vazio. ' +
  'Responda em JSON com as chaves "diagnostico" (texto), "sugestoes" (lista de textos) e "avisos" (lista de textos).';

function formatSpan(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min`;
  return `${Math.round((minutes / 60) * 10) / 10} h`.replace('.', ',');
}

const statsLine = (label: string, unit: string, stats: MetricStats | null) =>
  stats ? `- ${label}: mín ${stats.min} / média ${stats.avg} / máx ${stats.max} ${unit}` : null;

function trendText(slope: number | null): string {
  if (slope === null) return '';
  if (Math.abs(slope) < 1) return ' (tendência: estável)';
  return slope < 0
    ? ` (tendência: caindo ~${Math.abs(slope)} pontos por hora)`
    : ` (tendência: subindo ~${slope} pontos por hora)`;
}

function historyLines(stats: HistoryStats, history: SensorHistoryEntry[], now: number): string[] {
  if (stats.count === 0 || stats.newestAt === null) return ['Histórico salvo neste aparelho: nenhuma leitura ainda.'];
  const lines = [
    `Histórico salvo neste aparelho: ${stats.count} leituras em ${formatSpan(stats.spanMs)} (a mais recente ${formatAge(now - stats.newestAt)}).`,
    statsLine('Temperatura', '°C', stats.temp),
    stats.moist
      ? `${statsLine('Umidade do solo', '%', stats.moist)}${trendText(stats.moistSlopePerHour)}`
      : null,
    statsLine('Luz', 'lx', stats.light),
  ];
  const last = history
    .slice(-6)
    .map((entry) => `${entry.temp}°C/${entry.moist}%/${entry.light}lx`)
    .join('; ');
  lines.push(`Últimas leituras (da mais antiga para a mais recente): ${last}.`);
  return lines.filter((line): line is string => line !== null);
}

type PromptInput = {
  plant: PlantProfile;
  diagnosis: PlantDiagnosis;
  history: SensorHistoryEntry[];
  now?: number;
};

export function buildAdvisorMessages({
  plant,
  diagnosis,
  history,
  now = Date.now(),
}: PromptInput): { role: 'system' | 'user'; content: string }[] {
  const profile = CARE_PROFILES[plant.category] ?? CARE_PROFILES.moderada;
  const clock = new Date(now);
  const hhmm = `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`;

  const lines: string[] = [
    `Planta: "${plant.name}" — tipo: ${plant.category}.`,
    `Perfil de cuidado: ${profile.description}`,
    `Faixas ideais: temperatura ${profile.temp.idealMin}–${profile.temp.idealMax} °C; umidade do solo ${profile.moist.idealMin}–${profile.moist.idealMax} %; luz de dia ${profile.light.min}–${profile.light.max} lx.`,
    `Hora local: ${hhmm}.`,
  ];

  if (diagnosis.reading && diagnosis.readingAt !== null) {
    const origin = diagnosis.source === 'live' ? 'sensor conectado' : 'última leitura salva';
    const { temp, moist, light } = diagnosis.reading;
    lines.push(
      `Leitura atual (${formatAge(now - diagnosis.readingAt)}, ${origin}): ${temp} °C, umidade do solo ${moist} %, luz ${light} lx.`,
    );
  } else {
    lines.push('Leitura atual: ainda não há leituras.');
  }

  lines.push('', ...historyLines(summarizeHistory(history, now), history, now), '');

  if (diagnosis.findings.length === 0) {
    lines.push('Alertas calculados pelo sistema: nenhum — todos os valores estão dentro do ideal.');
  } else {
    lines.push('Alertas calculados pelo sistema:');
    diagnosis.findings.forEach((finding, index) => {
      const level = SEVERITY_META[finding.severity].label.toUpperCase();
      lines.push(`${index + 1}. [${level}] ${finding.title} — ${finding.detail} Ação sugerida: ${finding.suggestion}`);
    });
  }

  lines.push('', TASK_PROMPT);

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: lines.join('\n') },
  ];
}

function toStrings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, max);
}

/** Parses the model's JSON reply; throws if it has no usable diagnosis. */
export function parseAdvice(raw: string): AdviceBody {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('A resposta do modelo não veio no formato esperado.');

  const data = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  const diagnosis = typeof data.diagnostico === 'string' ? data.diagnostico.trim() : '';
  if (!diagnosis) throw new Error('A resposta do modelo veio sem diagnóstico.');

  return {
    diagnosis,
    suggestions: toStrings(data.sugestoes, 3),
    warnings: toStrings(data.avisos, 2),
  };
}
