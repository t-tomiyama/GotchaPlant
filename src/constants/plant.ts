import type { PlantCategory } from '@/types/plant';

export const PLANT_CATEGORIES: { value: PlantCategory; label: string; emoji: string }[] = [
  { value: 'tropical', label: 'Tropical', emoji: '🌴' },
  { value: 'moderada', label: 'Moderada', emoji: '🌿' },
  { value: 'suculenta', label: 'Suculenta', emoji: '🌵' },
];

const MINUTE_MS = 60_000;

export const SAVE_INTERVAL_OPTIONS: { label: string; value: number }[] = [
  { label: '1 Min', value: MINUTE_MS },
  { label: '30 Min', value: 30 * MINUTE_MS },
  { label: '1 Hora', value: 60 * MINUTE_MS },
  { label: '2 Horas', value: 120 * MINUTE_MS },
];

export type IntervalUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks';

/** Units for a custom ("Personalizado") save interval. */
export const INTERVAL_UNITS: { label: string; value: IntervalUnit; ms: number }[] = [
  { label: 'Segundos', value: 'seconds', ms: 1000 },
  { label: 'Minutos', value: 'minutes', ms: MINUTE_MS },
  { label: 'Horas', value: 'hours', ms: 60 * MINUTE_MS },
  { label: 'Dias', value: 'days', ms: 24 * 60 * MINUTE_MS },
  { label: 'Semanas', value: 'weeks', ms: 7 * 24 * 60 * MINUTE_MS },
];

/** Allowed amount for a custom interval, in whichever unit was picked. */
export const CUSTOM_INTERVAL_AMOUNT = { min: 1, max: 999 } as const;

/** How many of the most recent saved readings the dashboard chart draws. */
export const CHART_HISTORY_POINTS = 6;

export const AVATAR_OPTIONS = ['🌱', '🌵', '🌸', '🍀', '🌻', '🌷', '🪴', '🌼', '🍃', '🦋'];

export function getCategoryEmoji(category: PlantCategory): string {
  return PLANT_CATEGORIES.find((option) => option.value === category)?.emoji ?? '🌿';
}
