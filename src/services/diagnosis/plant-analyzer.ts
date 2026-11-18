import { CARE_PROFILES, type CareProfile, type Range } from '@/constants/plant-care';
import { SEVERITY_RANK } from '@/constants/severity';

import type {
  Finding,
  HistoryStats,
  Metric,
  MetricStats,
  PlantDiagnosis,
  SensorSnapshot,
  Severity,
} from '@/types/diagnosis';
import type { PlantProfile, SensorHistoryEntry } from '@/types/plant';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 18;
/** Darkness only counts as a problem if it lasted this long during the day. */
const SUSTAINED_LOW_LIGHT_MS = 30 * MINUTE_MS;
const MIN_LOW_LIGHT_SAMPLES = 4;
const LOW_LIGHT_LOOKBACK_MS = 3 * HOUR_MS;

const MIN_TREND_SAMPLES = 4;
const MIN_TREND_SPAN_MS = 20 * MINUTE_MS;
const TREND_LOOKBACK_MS = 3 * HOUR_MS;
/** Anything drying slower than this (points/hour) is treated as normal evaporation. */
const FAST_DRYING_SLOPE = -2;
const DRYING_HORIZON_HOURS = 12;

/** A saved reading is stale after this long, or after two save intervals if those are longer. */
const STALE_AFTER_MS = 2 * HOUR_MS;

const PLAUSIBLE: Record<Metric, [number, number]> = {
  temp: [-20, 70],
  moist: [0, 100],
  light: [0, 100_000],
};

const METRIC_ORDER: Record<Metric, number> = { moist: 0, temp: 1, light: 2 };

const round1 = (value: number) => Math.round(value * 10) / 10;

function isDaytime(timestamp: number): boolean {
  const hour = new Date(timestamp).getHours();
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
}

function classify(
  value: number,
  range: Range,
): { direction: 'low' | 'high'; severity: 'attention' | 'critical' } | null {
  if (value < range.criticalMin) return { direction: 'low', severity: 'critical' };
  if (value < range.idealMin) return { direction: 'low', severity: 'attention' };
  if (value > range.criticalMax) return { direction: 'high', severity: 'critical' };
  if (value > range.idealMax) return { direction: 'high', severity: 'attention' };
  return null;
}

function makeFinding(
  metric: Metric,
  kind: Finding['kind'],
  severity: Finding['severity'],
  text: Pick<Finding, 'title' | 'detail' | 'suggestion'>,
): Finding {
  return { id: `${metric}:${kind}:${severity}`, metric, kind, severity, ...text };
}

function temperatureFinding(value: number, profile: CareProfile): Finding | null {
  const result = classify(value, profile.temp);
  if (!result) return null;
  const { idealMin, idealMax } = profile.temp;
  const detail = `Temperatura em ${round1(value)}°C (ideal ${idealMin}–${idealMax}°C).`;
  if (result.direction === 'low') {
    return makeFinding('temp', 'too_low', result.severity, {
      title: result.severity === 'critical' ? 'Frio perigoso' : 'Temperatura baixa',
      detail,
      suggestion:
        result.severity === 'critical'
          ? 'Leve a planta para um lugar mais quente agora; o frio pode danificar folhas e raízes.'
          : 'Afaste a planta de janelas frias e de correntes de ar.',
    });
  }
  return makeFinding('temp', 'too_high', result.severity, {
    title: result.severity === 'critical' ? 'Calor perigoso' : 'Temperatura alta',
    detail,
    suggestion:
      result.severity === 'critical'
        ? 'Leve a planta para um lugar fresco e sombreado agora; o calor extremo queima as folhas e seca o solo.'
        : 'Tire a planta do sol direto e melhore a ventilação.',
  });
}

function moistureFinding(value: number, profile: CareProfile): Finding | null {
  const result = classify(value, profile.moist);
  if (!result) return null;
  const { idealMin, idealMax } = profile.moist;
  const detail = `Umidade do solo em ${round1(value)}% (ideal ${idealMin}–${idealMax}%).`;
  if (result.direction === 'low') {
    const when = result.severity === 'critical' ? 'agora' : 'nas próximas horas';
    return makeFinding('moist', 'too_low', result.severity, {
      title: result.severity === 'critical' ? 'Solo muito seco' : 'Solo seco',
      detail,
      suggestion: `Regue ${when}. ${profile.wateringTip}`,
    });
  }
  return makeFinding('moist', 'too_high', result.severity, {
    title: result.severity === 'critical' ? 'Solo encharcado' : 'Solo muito úmido',
    detail,
    suggestion:
      result.severity === 'critical'
        ? 'Suspenda a rega e confira a drenagem; o excesso de água apodrece as raízes.'
        : 'Espere o solo secar antes de regar de novo.',
  });
}

function sensorFaultFinding(metric: Metric, value: number): Finding {
  const names: Record<Metric, string> = {
    temp: 'temperatura',
    moist: 'umidade do solo',
    light: 'luminosidade',
  };
  return makeFinding(metric, 'sensor_fault', 'attention', {
    title: `Sensor de ${names[metric]} com leitura estranha`,
    detail: `O valor recebido (${value}) está fora do intervalo possível.`,
    suggestion: 'Confira a conexão e o posicionamento do sensor na placa.',
  });
}

/** Linear-regression slope of soil moisture in points/hour, or null if there's too little data. */
function moistureSlope(history: SensorHistoryEntry[], now: number): number | null {
  const recent = history.filter((entry) => now - entry.timestamp <= TREND_LOOKBACK_MS);
  if (recent.length < MIN_TREND_SAMPLES) return null;
  const first = recent[0].timestamp;
  const span = recent[recent.length - 1].timestamp - first;
  if (span < MIN_TREND_SPAN_MS) return null;

  const xs = recent.map((entry) => (entry.timestamp - first) / HOUR_MS);
  const ys = recent.map((entry) => entry.moist);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < xs.length; i++) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  return denominator === 0 ? null : numerator / denominator;
}

function dryingFastFinding(
  current: SensorSnapshot,
  history: SensorHistoryEntry[],
  profile: CareProfile,
  now: number,
): Finding | null {
  if (current.moist < profile.moist.idealMin) return null;
  const slope = moistureSlope(history, now);
  if (slope === null || slope > FAST_DRYING_SLOPE) return null;
  const hoursLeft = (current.moist - profile.moist.idealMin) / -slope;
  if (hoursLeft > DRYING_HORIZON_HOURS) return null;
  const eta = hoursLeft < 1 ? 'menos de 1 hora' : `cerca de ${Math.round(hoursLeft)} h`;
  return makeFinding('moist', 'drying_fast', 'attention', {
    title: 'Solo secando rápido',
    detail: `A umidade está caindo ~${round1(-slope)} pontos por hora e deve chegar ao mínimo ideal (${profile.moist.idealMin}%) em ${eta}.`,
    suggestion: `Planeje regar em breve. ${profile.wateringTip}`,
  });
}

function lightFinding(
  current: SensorSnapshot,
  history: SensorHistoryEntry[],
  profile: CareProfile,
  now: number,
): Finding | null {
  const { min, max } = profile.light;

  if (current.light > max) {
    return makeFinding('light', 'too_high', 'attention', {
      title: 'Luz muito intensa',
      detail: `Luminosidade em ${Math.round(current.light)} lx (acima de ${max} lx).`,
      suggestion: 'Se a planta estiver no sol direto, filtre a luz com uma cortina ou mude-a de lugar.',
    });
  }

  if (current.light >= min || !isDaytime(now)) return null;

  const recentDaylight = history.filter(
    (entry) => now - entry.timestamp <= LOW_LIGHT_LOOKBACK_MS && isDaytime(entry.timestamp),
  );
  if (recentDaylight.length < MIN_LOW_LIGHT_SAMPLES) return null;
  const span = recentDaylight[recentDaylight.length - 1].timestamp - recentDaylight[0].timestamp;
  if (span < SUSTAINED_LOW_LIGHT_MS) return null;
  const dark = recentDaylight.filter((entry) => entry.light < min).length;
  if (dark / recentDaylight.length < 0.8) return null;

  return makeFinding('light', 'low_light_daytime', 'attention', {
    title: 'Pouca luz durante o dia',
    detail: `Luminosidade em ${Math.round(current.light)} lx há pelo menos 30 min em horário de dia (mínimo ${min} lx).`,
    suggestion: 'Mude a planta para perto de uma janela iluminada.',
  });
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      METRIC_ORDER[a.metric] - METRIC_ORDER[b.metric],
  );
}

/** Every problem visible in one reading, given the plant's category and recent history. */
export function analyzeReading(
  category: PlantProfile['category'],
  current: SensorSnapshot,
  history: SensorHistoryEntry[],
  now: number,
): Finding[] {
  const profile = CARE_PROFILES[category] ?? CARE_PROFILES.moderada;
  const findings: Finding[] = [];

  const valid = (metric: Metric) => {
    const value = current[metric];
    const [low, high] = PLAUSIBLE[metric];
    const ok = Number.isFinite(value) && value >= low && value <= high;
    if (!ok) findings.push(sensorFaultFinding(metric, value));
    return ok;
  };

  if (valid('temp')) {
    const finding = temperatureFinding(current.temp, profile);
    if (finding) findings.push(finding);
  }
  if (valid('moist')) {
    const finding =
      moistureFinding(current.moist, profile) ?? dryingFastFinding(current, history, profile, now);
    if (finding) findings.push(finding);
  }
  if (valid('light')) {
    const finding = lightFinding(current, history, profile, now);
    if (finding) findings.push(finding);
  }

  return sortFindings(findings);
}

type DiagnoseInput = {
  plant: PlantProfile;
  /** Fresh reading from the sensor, if connected. Falls back to the last saved entry. */
  liveReading?: SensorSnapshot | null;
  history: SensorHistoryEntry[];
  now?: number;
};

export function diagnosePlant({
  plant,
  liveReading,
  history,
  now = Date.now(),
}: DiagnoseInput): PlantDiagnosis {
  const lastSaved = history.length > 0 ? history[history.length - 1] : null;

  let reading: SensorSnapshot | null = null;
  let readingAt: number | null = null;
  let source: PlantDiagnosis['source'] = 'none';
  if (liveReading) {
    reading = liveReading;
    readingAt = now;
    source = 'live';
  } else if (lastSaved) {
    reading = { temp: lastSaved.temp, moist: lastSaved.moist, light: lastSaved.light };
    readingAt = lastSaved.timestamp;
    source = 'history';
  }

  const staleAfter = Math.max(STALE_AFTER_MS, 2 * (plant.saveInterval || 0));
  const stale = source === 'history' && readingAt !== null && now - readingAt > staleAfter;
  const findings = reading ? analyzeReading(plant.category, reading, history, now) : [];
  const severity: Severity = findings[0]?.severity ?? 'ok';

  let headline = 'Tudo certo';
  if (source === 'none') headline = 'Aguardando a primeira leitura';
  else if (findings.length > 0) headline = findings[0].title;

  return {
    plantId: plant.id,
    severity,
    findings,
    headline,
    reading,
    readingAt,
    source,
    stale,
    generatedAt: now,
  };
}

/** Same signature = same situation; used to know when a cached AI analysis is out of date. */
export function diagnosisSignature(diagnosis: PlantDiagnosis): string {
  return diagnosis.findings.length === 0 ? 'ok' : diagnosis.findings.map((f) => f.id).join('|');
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Per-metric median of a few consecutive readings, so one noisy sample can't trigger an alert. */
export function medianSnapshot(readings: SensorSnapshot[]): SensorSnapshot {
  return {
    temp: median(readings.map((r) => r.temp)),
    moist: median(readings.map((r) => r.moist)),
    light: median(readings.map((r) => r.light)),
  };
}

function statsFor(history: SensorHistoryEntry[], metric: Metric): MetricStats | null {
  const values = history.map((entry) => entry[metric]).filter(Number.isFinite);
  if (values.length === 0) return null;
  return {
    min: round1(Math.min(...values)),
    max: round1(Math.max(...values)),
    avg: round1(values.reduce((sum, v) => sum + v, 0) / values.length),
  };
}

/** Aggregates over the plant's locally stored history — what the on-device model "reads". */
export function summarizeHistory(history: SensorHistoryEntry[], now: number = Date.now()): HistoryStats {
  const slope = moistureSlope(history, now);
  return {
    count: history.length,
    spanMs: history.length > 1 ? history[history.length - 1].timestamp - history[0].timestamp : 0,
    newestAt: history.length > 0 ? history[history.length - 1].timestamp : null,
    temp: statsFor(history, 'temp'),
    moist: statsFor(history, 'moist'),
    light: statsFor(history, 'light'),
    moistSlopePerHour: slope === null ? null : round1(slope),
  };
}
