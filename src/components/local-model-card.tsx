import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GardenButton, GardenCard, gardenText } from './garden/garden-ui';

import { AI_MODEL, formatModelSize } from '@/constants/ai-model';
import { Garden } from '@/constants/garden';
import { Spacing } from '@/constants/theme';

import type { LocalModelState } from '@/services/ai/local-model';

type LocalModelCardProps = {
  state: LocalModelState;
  onDownload: () => void;
  onCancel: () => void;
  /** When given, an installed model shows a "Remover" action. */
  onRemove?: () => void;
};

const PRIVACY_NOTE =
  'Nenhum dado é enviado para terceiros: os dados são analisados apenas localmente, no seu dispositivo.';

export function LocalModelCard({ state, onDownload, onCancel, onRemove }: LocalModelCardProps) {
  const size = formatModelSize(AI_MODEL.sizeBytes);

  const confirmRemove = () =>
    Alert.alert('Remover modelo de IA', `Isso libera ${size}. Você poderá baixar de novo quando quiser.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: onRemove },
    ]);

  return (
    <GardenCard style={styles.card}>
      {state.status === 'checking' && <ActivityIndicator color={Garden.green} />}

      {(state.status === 'missing' || state.status === 'error') && (
        <>
          <Text style={gardenText.title}>IA no aparelho</Text>
          {state.status === 'error' && <Text style={styles.error}>{state.message}</Text>}
          <Text style={gardenText.muted}>
            Baixe o modelo {AI_MODEL.label} ({size}) para receber um diagnóstico escrito e sugestões para cada
            planta. Use Wi-Fi se puder. {PRIVACY_NOTE}
          </Text>
          <GardenButton
            label={state.status === 'error' ? 'Tentar de novo' : `Baixar modelo (${size})`}
            onPress={onDownload}
          />
        </>
      )}

      {state.status === 'downloading' && (
        <>
          <Text style={gardenText.title}>Baixando modelo… {Math.round(state.progress * 100)}%</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(state.progress * 100)}%` }]} />
          </View>
          <Text style={gardenText.muted}>Mantenha o app aberto até terminar.</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={gardenText.link}>Cancelar download</Text>
          </TouchableOpacity>
        </>
      )}

      {state.status === 'ready' && (
        <>
          <View style={styles.readyRow}>
            <View style={styles.dot} />
            <Text style={gardenText.title}>IA no aparelho instalada</Text>
          </View>
          <Text style={gardenText.muted}>
            {AI_MODEL.label} · {size}. {PRIVACY_NOTE}
          </Text>
          {onRemove && (
            <TouchableOpacity onPress={confirmRemove}>
              <Text style={styles.remove}>Remover modelo</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </GardenCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two },
  error: { color: '#E5484D', fontWeight: '700' },
  track: { height: 10, borderRadius: 5, backgroundColor: Garden.greenSoft, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: Garden.green },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Garden.green },
  remove: { color: '#E5484D', fontWeight: '800', fontSize: 14 },
});
