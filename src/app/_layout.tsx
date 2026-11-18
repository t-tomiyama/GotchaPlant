import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { UserSessionProvider, useUserSession } from '@/context/user-session-context';
import { useBackgroundMonitorAutostart } from '@/hooks/use-background-monitor';
import { usePlantNotifications } from '@/hooks/use-plant-notifications';
import { configureNotificationHandler } from '@/services/notifications/plant-notifications';

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Title font of the tamagotchi dashboard, so native screens share its look.
  useFonts({ RumRaisin: require('@/assets/fonts/RumRaisin-Regular.ttf') });
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <UserSessionProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </UserSessionProvider>
    </ThemeProvider>
  );
}

/**
 * Gates the app behind a local user profile: while there isn't one, only
 * "create-profile" is reachable; once there is, the tabs + plant screens are.
 */
function RootNavigator() {
  const { status } = useUserSession();
  usePlantNotifications(status === 'ready');
  useBackgroundMonitorAutostart(status === 'ready');

  if (status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'anonymous'}>
        <Stack.Screen name="create-profile" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plant/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plant/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
