import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GardenBackground } from '@/components/garden/garden-background';
import { GardenCard, GardenTitle, gardenText } from '@/components/garden/garden-ui';
import { ProfileForm } from '@/components/profile-form';
import { Spacing } from '@/constants/theme';
import { useUserSession } from '@/context/user-session-context';

export default function CreateProfileScreen() {
  const { saveProfile } = useUserSession();

  return (
    <View style={styles.flex}>
      <GardenBackground />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <GardenTitle>GotchaPlant</GardenTitle>
          <Text style={[gardenText.body, styles.subtitle]}>
            Crie seu perfil para começar a cuidar das suas plantas.
          </Text>
          <GardenCard style={styles.card}>
            <ProfileForm submitLabel="Continuar" onSubmit={saveProfile} />
          </GardenCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, flexGrow: 1, justifyContent: 'center', gap: Spacing.three },
  subtitle: { textAlign: 'center' },
  card: { padding: Spacing.four },
});
