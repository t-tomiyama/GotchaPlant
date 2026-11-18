import type { Severity } from '@/types/diagnosis';

export const SEVERITY_META: Record<Severity, { label: string; emoji: string; color: string }> = {
  ok: { label: 'Tudo certo', emoji: '✅', color: '#30A46C' },
  attention: { label: 'Atenção', emoji: '⚠️', color: '#E5960B' },
  critical: { label: 'Crítico', emoji: '🚨', color: '#E5484D' },
};

export const SEVERITY_RANK: Record<Severity, number> = { ok: 0, attention: 1, critical: 2 };
