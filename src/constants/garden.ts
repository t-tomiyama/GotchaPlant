/**
 * Palette of the tamagotchi dashboard (index.html, "happy" mood), reused by the
 * native screens so the menus and the plant screen look like the same app.
 */
export const Garden = {
  sky1: '#E0F7FA',
  sky2: '#B2EBF2',
  hillBack: '#A5D6A7',
  hillFront: '#81C784',
  cloud: '#FFFFFF',

  green: '#4CAF50',
  greenLight: '#66BB6A',
  greenSoft: '#E8F5E9',
  greenDark: '#1B5E20',
  pot: '#A1887F',

  // Opaque on purpose: Android draws elevation shadows through translucent views.
  card: '#FFFFFF',
  cardBorder: 'rgba(76,175,80,0.18)',
  text: '#424242',
  textMuted: '#757575',
  label: '#9E9E9E',
} as const;

export const GardenFonts = {
  title: 'RumRaisin',
} as const;

/** Soft drop shadow used by every floating card/button (matches the web cards). */
export const gardenShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;
