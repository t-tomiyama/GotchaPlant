import { getCategoryEmoji } from '@/constants/plant';
import { SEVERITY_META } from '@/constants/severity';

import type { AlertState, Finding } from '@/types/diagnosis';
import type { PlantProfile } from '@/types/plant';

/** Minimum time before the same alert can notify again. */
export const ALERT_COOLDOWN_MS: Record<Finding['severity'], number> = {
  critical: 30 * 60_000,
  attention: 3 * 60 * 60_000,
};

/**
 * Findings that haven't notified recently. The finding id includes its severity,
 * so a problem that escalates from attention to critical notifies immediately.
 */
export function selectDueFindings(findings: Finding[], state: AlertState, now: number): Finding[] {
  return findings.filter((finding) => now - (state[finding.id] ?? 0) >= ALERT_COOLDOWN_MS[finding.severity]);
}

export type AlertContent = {
  title: string;
  body: string;
  severity: Finding['severity'];
};

/**
 * `due` must be sorted most severe first (as diagnosePlant returns them).
 * The plant's name is always in the title so it's clear which plant it's about.
 */
export function buildAlertContent(plant: PlantProfile, due: Finding[], totalFindings: number): AlertContent {
  const primary = due[0];
  const marker = SEVERITY_META[primary.severity].emoji;
  const others = totalFindings - 1;
  const more = others > 0 ? ` (+${others} ${others === 1 ? 'outro alerta' : 'outros alertas'})` : '';
  return {
    title: `${marker} ${getCategoryEmoji(plant.category)} ${plant.name}: ${primary.title}`,
    body: `${primary.detail} ${primary.suggestion}${more}`,
    severity: primary.severity,
  };
}
