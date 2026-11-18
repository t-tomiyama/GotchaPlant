import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BleDevicePicker } from '@/components/ble-device-picker';
import { GardenBackground } from '@/components/garden/garden-background';
import { GardenButton, GardenCard, GardenTitle, gardenText } from '@/components/garden/garden-ui';
import { OptionRow } from '@/components/option-row';
import { gardenInput } from '@/components/profile-form';
import { Garden } from '@/constants/garden';
import {
  CUSTOM_INTERVAL_AMOUNT,
  INTERVAL_UNITS,
  PLANT_CATEGORIES,
  SAVE_INTERVAL_OPTIONS,
  type IntervalUnit,
} from '@/constants/plant';
import { Spacing } from '@/constants/theme';
import { usePlants } from '@/hooks/use-plants';

import type { PlantCategory } from '@/types/plant';

const CUSTOM = 'custom';
const INTERVAL_CHOICES: { label: string; value: number | typeof CUSTOM }[] = [
  ...SAVE_INTERVAL_OPTIONS,
  { label: 'Personalizado', value: CUSTOM },
];

export default function NewPlantScreen() {
  const router = useRouter();
  const { addPlant } = usePlants();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlantCategory>('moderada');
  const [intervalChoice, setIntervalChoice] = useState<number | typeof CUSTOM>(SAVE_INTERVAL_OPTIONS[0].value);
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState<IntervalUnit>('minutes');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);

  const handlePickDevice = (pickedId: string, pickedName: string | null) => {
    setDeviceId(pickedId);
    setDeviceName(pickedName);
  };

  const amount = Number(customAmount);
  const customValid =
    Number.isInteger(amount) && amount >= CUSTOM_INTERVAL_AMOUNT.min && amount <= CUSTOM_INTERVAL_AMOUNT.max;
  const unitMs = INTERVAL_UNITS.find((unit) => unit.value === customUnit)?.ms ?? 60_000;
  const saveInterval = intervalChoice === CUSTOM ? amount * unitMs : intervalChoice;
  const canSave = name.trim().length > 0 && (intervalChoice !== CUSTOM || customValid);

  const handleSave = async () => {
    if (!canSave) return;
    const plant = await addPlant({ name: name.trim(), category, saveInterval, deviceId, deviceName });
    router.replace({ pathname: '/plant/[id]', params: { id: plant.id } });
  };

  return (
    <View style={styles.flex}>
      <GardenBackground />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <GardenTitle size={36}>Nova Planta</GardenTitle>

          <GardenCard style={styles.card}>
            <Text style={styles.label}>Como ela se chama?</Text>
            <TextInput
              style={gardenInput}
              placeholder="Ex: Robertinha"
              placeholderTextColor={Garden.label}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, styles.spaced]}>Qual o tipo da planta?</Text>
            <OptionRow
              options={PLANT_CATEGORIES.map((option) => ({
                label: `${option.emoji} ${option.label}`,
                value: option.value,
              }))}
              value={category}
              onChange={setCategory}
            />

            <Text style={[styles.label, styles.spaced]}>Frequência de registro (gráfico)</Text>
            <OptionRow options={INTERVAL_CHOICES} value={intervalChoice} onChange={setIntervalChoice} />
            {intervalChoice === CUSTOM && (
              <View style={styles.customBox}>
                <Text style={gardenText.muted}>Registrar a cada</Text>
                <TextInput
                  style={gardenInput}
                  placeholder="Ex: 45"
                  placeholderTextColor={Garden.label}
                  keyboardType="number-pad"
                  value={customAmount}
                  onChangeText={(text) => setCustomAmount(text.replace(/[^0-9]/g, ''))}
                  accessibilityLabel="Quantidade do intervalo personalizado"
                />
                <OptionRow options={INTERVAL_UNITS} value={customUnit} onChange={setCustomUnit} />
                {customAmount.length > 0 && !customValid && (
                  <Text style={styles.error}>
                    Use um número inteiro entre {CUSTOM_INTERVAL_AMOUNT.min} e {CUSTOM_INTERVAL_AMOUNT.max}.
                  </Text>
                )}
              </View>
            )}

            <Text style={[styles.label, styles.spaced]}>Dispositivo Bluetooth</Text>
            <BleDevicePicker selectedDeviceId={deviceId} onSelect={handlePickDevice} />
            <Text style={gardenText.muted}>
              {deviceId
                ? `Selecionado: ${deviceName ?? deviceId}`
                : 'Você também pode conectar depois, na tela da planta.'}
            </Text>
          </GardenCard>

          <GardenButton label="Começar Aventura" onPress={handleSave} disabled={!canSave} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, flexGrow: 1 },
  card: { gap: Spacing.two, padding: Spacing.four },
  label: { color: Garden.greenDark, fontSize: 14, fontWeight: '900' },
  spaced: { marginTop: Spacing.two },
  customBox: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Garden.hillFront,
  },
  error: { color: '#E5484D', fontWeight: '700' },
});
