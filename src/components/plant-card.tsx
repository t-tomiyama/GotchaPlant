import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GardenCard, gardenText } from './garden/garden-ui';
import { SeverityBadge } from './severity-badge';

import { Garden } from '@/constants/garden';
import { getCategoryEmoji } from '@/constants/plant';
import { Spacing } from '@/constants/theme';

import type { PlantDiagnosis } from '@/types/diagnosis';
import type { PlantProfile } from '@/types/plant';

type PlantCardProps = {
  plant: PlantProfile;
  onPress: () => void;
  /** Health from the last saved reading. Omitted while it is still loading. */
  diagnosis?: PlantDiagnosis;
};

export function PlantCard({ plant, onPress, diagnosis }: PlantCardProps) {
  const showBadge = diagnosis && diagnosis.source !== 'none' && diagnosis.severity !== 'ok' && !diagnosis.stale;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
      <GardenCard style={styles.card}>
        {/* Little potted plant, echoing the tamagotchi screen. */}
        <View style={styles.potted}>
          <View style={styles.bubble}>
            <Text style={styles.emoji}>{getCategoryEmoji(plant.category)}</Text>
          </View>
          <View style={styles.potRim} />
          <View style={styles.potBody} />
        </View>
        <View style={styles.info}>
          <Text style={gardenText.title}>{plant.name}</Text>
          <Text style={[gardenText.muted, styles.category]}>Perfil: {plant.category}</Text>
          {showBadge && <SeverityBadge severity={diagnosis.severity} label={diagnosis.headline} />}
        </View>
        <View style={[styles.status, plant.deviceId ? styles.statusLinked : null]}>
          <Text style={styles.statusText}>{plant.deviceId ? 'BLE' : '›'}</Text>
        </View>
      </GardenCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  potted: { alignItems: 'center', width: 60 },
  bubble: {
    width: 52,
    height: 44,
    borderRadius: 22,
    backgroundColor: Garden.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  potRim: { width: 52, height: 6, borderRadius: 3, backgroundColor: '#8D6E63', marginTop: 3 },
  potBody: {
    width: 40,
    height: 12,
    backgroundColor: Garden.pot,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  info: { flex: 1, gap: Spacing.half },
  category: { textTransform: 'capitalize' },
  status: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: Spacing.two,
    backgroundColor: Garden.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLinked: { backgroundColor: '#E3F2FD' },
  statusText: { color: Garden.greenDark, fontWeight: '900', fontSize: 16 },
});
