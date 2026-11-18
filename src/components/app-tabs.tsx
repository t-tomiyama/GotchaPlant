import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Garden } from '@/constants/garden';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Garden.greenSoft}
      indicatorColor={Garden.hillBack}
      iconColor={{ default: Garden.textMuted, selected: Garden.greenDark }}
      labelStyle={{ default: { color: Garden.textMuted }, selected: { color: Garden.greenDark, fontWeight: '800' } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
