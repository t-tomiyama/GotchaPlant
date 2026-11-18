import * as Notifications from 'expo-notifications';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { setupNotifications } from '@/services/notifications/plant-notifications';

/**
 * Prepares notifications once the user is signed in (channels + permission) and
 * opens the plant screen when one of the alerts is tapped — including when the
 * tap is what launched the app.
 */
export function usePlantNotifications(enabled: boolean) {
  const router = useRouter();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (enabled) void setupNotifications();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !navigationReady || !response) return;

    const { identifier, content } = response.notification.request;
    const key = `${identifier}:${response.notification.date}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    const plantId = content.data?.plantId;
    if (typeof plantId === 'string') {
      router.navigate({ pathname: '/plant/[id]', params: { id: plantId } });
    }
  }, [enabled, navigationReady, response, router]);
}
