import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Garden } from '@/constants/garden';
import { AVATAR_OPTIONS } from '@/constants/plant';
import { Spacing } from '@/constants/theme';

type AvatarPickerProps = {
  value: string;
  onChange: (avatar: string) => void;
};

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <View style={styles.grid}>
      {AVATAR_OPTIONS.map((avatar) => {
        const selected = avatar === value;
        return (
          <TouchableOpacity
            key={avatar}
            onPress={() => onChange(avatar)}
            style={[styles.item, selected && styles.itemSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}>
            <Text style={styles.emoji}>{avatar}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  item: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Garden.greenSoft,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: { borderColor: Garden.green, backgroundColor: '#FFFFFF' },
  emoji: { fontSize: 26 },
});
