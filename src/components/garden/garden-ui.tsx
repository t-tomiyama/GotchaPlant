import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Garden, GardenFonts, gardenShadow } from '@/constants/garden';
import { Spacing } from '@/constants/theme';

/** "GotchaPlant"-style title: white letters with a thick green outline, like the dashboard logo. */
export function GardenTitle({ children, size = 40 }: { children: string; size?: number }) {
  const offsets = [
    [-2, -2],
    [2, -2],
    [-2, 2],
    [2, 2],
    [4, 4],
  ];
  const base: TextStyle = { fontFamily: GardenFonts.title, fontSize: size, lineHeight: size * 1.25, letterSpacing: 1.5 };
  return (
    <View style={styles.titleWrap} accessibilityRole="header" accessible accessibilityLabel={children}>
      {offsets.map(([x, y]) => (
        <Text
          key={`${x}${y}`}
          style={[base, styles.titleLayer, { color: Garden.greenLight, transform: [{ translateX: x }, { translateY: y }] }]}
          importantForAccessibility="no">
          {children}
        </Text>
      ))}
      <Text style={[base, { color: '#FFFFFF' }]} importantForAccessibility="no">
        {children}
      </Text>
    </View>
  );
}

export function GardenCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Small uppercase heading, like "HISTÓRICO SALVO" on the dashboard. */
export function GardenSection({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function GardenPill({ children }: { children: ReactNode }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

type GardenButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'soft';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GardenButton({ label, onPress, variant = 'primary', disabled, loading, style }: GardenButtonProps) {
  const primary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={[
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSoft,
        primary && gardenShadow,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? '#FFFFFF' : Garden.greenDark} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? '#FFFFFF' : Garden.greenDark }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export const gardenText = StyleSheet.create({
  title: { color: Garden.greenDark, fontSize: 18, fontWeight: '900' },
  body: { color: Garden.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  muted: { color: Garden.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  link: { color: Garden.green, fontSize: 14, fontWeight: '800' },
});

const styles = StyleSheet.create({
  titleWrap: { alignSelf: 'center' },
  titleLayer: { position: 'absolute', top: 0, left: 0 },
  card: {
    backgroundColor: Garden.card,
    borderRadius: 20,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Garden.cardBorder,
    ...gardenShadow,
  },
  section: {
    color: Garden.label,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: Spacing.two,
    marginLeft: Spacing.one,
  },
  pill: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    ...gardenShadow,
  },
  pillText: { color: Garden.greenDark, fontSize: 14, fontWeight: '800' },
  button: { borderRadius: 24, paddingVertical: 14, paddingHorizontal: Spacing.five, alignItems: 'center' },
  buttonPrimary: { backgroundColor: Garden.green },
  buttonSoft: { backgroundColor: Garden.greenSoft, borderWidth: 1, borderColor: Garden.cardBorder },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
});
