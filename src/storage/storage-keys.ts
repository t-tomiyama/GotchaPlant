export const StorageKeys = {
  userProfile: 'user:profile',
  /** Whether the background monitoring service should run (user setting). */
  backgroundMonitoring: 'settings:backgroundMonitoring',
  plantsIndex: 'plants:index',
  plantProfile: (id: string) => `plant:${id}:profile`,
  plantHistory: (id: string) => `plant:${id}:history`,
  /** Last time each alert was notified, so the same problem isn't repeated every reading. */
  plantAlertState: (id: string) => `plant:${id}:alerts`,
  /** Last analysis written by the on-device model. */
  plantAdvice: (id: string) => `plant:${id}:advice`,

  /** Single-plant keys used before multi-plant support existed. See migrateLegacyPlant(). */
  legacyPlantProfile: 'plantProfile',
  legacyPlantHistory: 'plantHistory',
} as const;
