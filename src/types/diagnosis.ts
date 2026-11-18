import type { SensorHistoryEntry } from './plant';

export type Severity = 'ok' | 'attention' | 'critical';

export type Metric = 'temp' | 'moist' | 'light';

export type SensorSnapshot = Pick<SensorHistoryEntry, Metric>;

export type FindingKind = 'too_low' | 'too_high' | 'drying_fast' | 'low_light_daytime' | 'sensor_fault';

export type Finding = {
  /** Stable key (`metric:kind:severity`) used to rate-limit notifications. */
  id: string;
  metric: Metric;
  kind: FindingKind;
  severity: Exclude<Severity, 'ok'>;
  title: string;
  detail: string;
  suggestion: string;
};

export type ReadingSource = 'live' | 'history' | 'none';

export type PlantDiagnosis = {
  plantId: string;
  severity: Severity;
  /** Most severe first. */
  findings: Finding[];
  headline: string;
  reading: SensorSnapshot | null;
  readingAt: number | null;
  /** `live` = fresh BLE reading, `history` = last saved entry, `none` = nothing recorded yet. */
  source: ReadingSource;
  /** True when the only data is a saved reading that is too old to trust. */
  stale: boolean;
  generatedAt: number;
};

export type MetricStats = { min: number; avg: number; max: number };

export type HistoryStats = {
  count: number;
  spanMs: number;
  newestAt: number | null;
  temp: MetricStats | null;
  moist: MetricStats | null;
  light: MetricStats | null;
  /** Soil-moisture change in percentage points per hour, or null when there isn't enough data. */
  moistSlopePerHour: number | null;
};

export type PlantAdvice = {
  diagnosis: string;
  suggestions: string[];
  warnings: string[];
  generatedAt: number;
  /** Diagnosis signature the advice was written for, to detect when the situation has changed. */
  basedOn: string;
  modelId: string;
};

/** Finding id -> timestamp of the last notification sent for it. */
export type AlertState = Record<string, number>;
