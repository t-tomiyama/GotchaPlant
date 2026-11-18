import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GardenBackground } from '@/components/garden/garden-background';
import { GardenCard, GardenSection, GardenTitle, gardenText } from '@/components/garden/garden-ui';
import { LocalModelCard } from '@/components/local-model-card';
import { ProfileForm } from '@/components/profile-form';
import { Garden } from '@/constants/garden';
import { getCategoryEmoji } from '@/constants/plant';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useUserSession } from '@/context/user-session-context';
import { useBackgroundMonitor } from '@/hooks/use-background-monitor';
import { useLocalModel } from '@/hooks/use-local-model';
import { usePlants } from '@/hooks/use-plants';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, saveProfile, clearProfile } = useUserSession();
  const { plants, removePlant } = usePlants();
  const model = useLocalModel();
  const monitor = useBackgroundMonitor();
  const [editing, setEditing] = useState(false);

  const handleRemovePlant = (id: string, name: string) => {
    Alert.alert('Remover planta', `Remover "${name}" e todo o histórico salvo?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removePlant(id) },
    ]);
  };

  const handleReset = () => {
    Alert.alert('Resetar aplicativo', 'Isso apaga seu perfil e todas as plantas registradas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resetar',
        style: 'destructive',
        onPress: async () => {
          if (monitor.enabled) await monitor.toggle(false);
          await Promise.all(plants.map((plant) => removePlant(plant.id)));
          await clearProfile();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <GardenBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.six,
          },
        ]}>
        <GardenTitle size={34}>Meu Jardim</GardenTitle>

        <GardenCard style={styles.profileCard}>
          {editing ? (
            <ProfileForm
              initialProfile={profile ?? undefined}
              submitLabel="Salvar"
              onSubmit={async (nextProfile) => {
                await saveProfile(nextProfile);
                setEditing(false);
              }}
            />
          ) : (
            <View style={styles.profileRow}>
              <View style={styles.avatarBubble}>
                <Text style={styles.avatar}>{profile?.avatar ?? '🌱'}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{profile?.name}</Text>
                <Text style={gardenText.muted}>
                  {plants.length} {plants.length === 1 ? 'planta cuidada' : 'plantas cuidadas'}
                </Text>
                <TouchableOpacity onPress={() => setEditing(true)}>
                  <Text style={gardenText.link}>Editar perfil</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </GardenCard>

        <GardenSection>Plantas registradas</GardenSection>
        {plants.length === 0 ? (
          <GardenCard>
            <Text style={gardenText.muted}>Nenhuma planta registrada ainda.</Text>
          </GardenCard>
        ) : (
          <GardenCard style={styles.listCard}>
            {plants.map((plant, index) => (
              <View key={plant.id} style={[styles.plantRow, index > 0 && styles.divider]}>
                <Text style={styles.plantEmoji}>{getCategoryEmoji(plant.category)}</Text>
                <View style={styles.plantInfo}>
                  <Text style={gardenText.body}>{plant.name}</Text>
                  <Text style={[gardenText.muted, styles.capitalize]}>{plant.category}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemovePlant(plant.id, plant.name)}>
                  <Text style={styles.remove}>Remover</Text>
                </TouchableOpacity>
              </View>
            ))}
          </GardenCard>
        )}

        <GardenSection>Monitoramento</GardenSection>
        <GardenCard style={styles.monitorCard}>
          <View style={styles.monitorRow}>
            <View style={styles.monitorText}>
              <Text style={gardenText.title}>Monitorar em segundo plano</Text>
              <Text style={gardenText.muted}>
                Com o app fechado, sempre que você estiver perto de uma planta e já tiver passado o tempo da
                frequência de registro, o app conecta, salva a leitura e avisa se algo estiver errado.
              </Text>
            </View>
            <Switch
              value={monitor.enabled}
              disabled={monitor.busy}
              onValueChange={monitor.toggle}
              trackColor={{ false: Garden.greenSoft, true: Garden.hillFront }}
              thumbColor={monitor.enabled ? Garden.green : '#FFFFFF'}
              accessibilityLabel="Monitorar em segundo plano"
            />
          </View>
          {monitor.enabled && (
            <Text style={gardenText.muted}>
              Uma notificação fixa fica visível enquanto o monitoramento estiver ativo.
            </Text>
          )}
        </GardenCard>

        <GardenSection>Inteligência artificial</GardenSection>
        <LocalModelCard
          state={model.state}
          onDownload={model.download}
          onCancel={model.cancel}
          onRemove={model.remove}
        />

        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.reset}>Resetar dados do aplicativo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  profileCard: { padding: Spacing.four },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatarBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Garden.greenSoft,
    borderWidth: 3,
    borderColor: Garden.hillBack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { fontSize: 40 },
  profileInfo: { flex: 1, gap: Spacing.half },
  name: { color: Garden.greenDark, fontSize: 26, fontWeight: '900' },
  listCard: { paddingVertical: Spacing.one },
  plantRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  divider: { borderTopWidth: 1, borderTopColor: Garden.cardBorder },
  plantEmoji: { fontSize: 26 },
  plantInfo: { flex: 1 },
  capitalize: { textTransform: 'capitalize' },
  remove: { color: '#E5484D', fontWeight: '800', fontSize: 14 },
  monitorCard: { gap: Spacing.two },
  monitorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  monitorText: { flex: 1, gap: Spacing.one },
  resetButton: {
    alignSelf: 'center',
    marginTop: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  reset: { color: Garden.textMuted, fontWeight: '800' },
});
