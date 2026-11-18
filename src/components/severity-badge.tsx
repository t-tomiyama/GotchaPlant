import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { SEVERITY_META } from '@/constants/severity';
import { Spacing } from '@/constants/theme';

import type { Severity } from '@/types/diagnosis';

type SeverityBadgeProps = {
  severity: Severity;
  label?: string;
};

export function SeverityBadge({ severity, label }: SeverityBadgeProps) {
  const meta = SEVERITY_META[severity];
  return (
    <View style={[styles.badge, { backgroundColor: `${meta.color}22`, borderColor: meta.color }]}>
      <ThemedText type="smallBold" style={{ color: meta.color }}>
        {meta.emoji} {label ?? meta.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
});
