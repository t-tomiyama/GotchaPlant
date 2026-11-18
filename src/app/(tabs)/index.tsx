import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GardenBackground } from '@/components/garden/garden-background';
import { GardenButton, GardenCard, GardenPill, GardenSection, GardenTitle, gardenText } from '@/components/garden/garden-ui';
import { PlantCard } from '@/components/plant-card';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useUserSession } from '@/context/user-session-context';
import { usePlants } from '@/hooks/use-plants';
import { usePlantsHealth } from '@/hooks/use-plants-health';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useUserSession();
  const { plants, loading, refresh } = usePlants();
  const health = usePlantsHealth(plants);

  const goToPlant = useCallback(
    (id: string) => router.push({ pathname: '/plant/[id]', params: { id } }),
    [router],
  );
  const goToNewPlant = useCallback(() => router.push('/plant/new'), [router]);

  return (
    <View style={styles.container}>
      <GardenBackground />
      <FlatList
        data={plants}
        extraData={health}
        keyExtractor={(plant) => plant.id}
        onRefresh={refresh}
        refreshing={loading}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.six + Spacing.four,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <GardenTitle>GotchaPlant</GardenTitle>
            <GardenPill>
              Olá, {profile?.name ?? 'jardineiro'} {profile?.avatar ?? '🌱'}
            </GardenPill>
            <GardenSection>{`Suas plantas (${plants.length})`}</GardenSection>
          </View>
        }
        renderItem={({ item }) => (
          <PlantCard plant={item} diagnosis={health[item.id]} onPress={() => goToPlant(item.id)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading ? (
            <GardenCard style={styles.empty}>
              <Text style={styles.emptyIcon}>🪴</Text>
              <Text style={gardenText.title}>Nenhuma planta ainda</Text>
              <Text style={[gardenText.muted, styles.center]}>
                Adicione sua primeira planta para começar a monitorar.
              </Text>
            </GardenCard>
          ) : null
        }
      />

      <View
        style={[styles.addButton, { bottom: insets.bottom + BottomTabInset + Spacing.two }]}
        pointerEvents="box-none">
        <GardenButton label="+ Adicionar planta" onPress={goToNewPlant} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.four, flexGrow: 1 },
  header: { gap: Spacing.three, marginBottom: Spacing.three },
  separator: { height: Spacing.three },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  emptyIcon: { fontSize: 48 },
  center: { textAlign: 'center' },
  addButton: { position: 'absolute', alignSelf: 'center' },
});
