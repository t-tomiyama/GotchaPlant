import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Garden } from '@/constants/garden';
import { Spacing } from '@/constants/theme';

type OptionRowProps<T extends string | number> = {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
};

/** Row of selectable pill buttons, shared by the plant category/interval pickers. */
export function OptionRow<T extends string | number>({ options, value, onChange }: OptionRowProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[styles.choice, selected && styles.choiceSelected]}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}>
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Wraps so longer lists (e.g. intervals + "Personalizado") stay readable: max 3 per line.
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choice: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two + 2,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: Garden.greenSoft,
    borderWidth: 1,
    borderColor: Garden.cardBorder,
  },
  choiceSelected: { backgroundColor: Garden.green, borderColor: Garden.green },
  label: { color: Garden.greenDark, fontWeight: '800', fontSize: 14 },
  labelSelected: { color: '#FFFFFF' },
});
