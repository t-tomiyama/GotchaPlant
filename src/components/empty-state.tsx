import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  icon?: string;
  title: string;
  message?: string;
  children?: ReactNode;
};

export function EmptyState({ icon = '🌱', title, message, children }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
  },
  icon: { fontSize: 56 },
  title: { textAlign: 'center' },
  message: { textAlign: 'center' },
});
