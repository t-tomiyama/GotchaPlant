import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AvatarPicker } from './avatar-picker';
import { GardenButton, gardenText } from './garden/garden-ui';

import { Garden } from '@/constants/garden';
import { AVATAR_OPTIONS } from '@/constants/plant';
import { Spacing } from '@/constants/theme';

import type { UserProfile } from '@/types/user';

type ProfileFormProps = {
  initialProfile?: UserProfile;
  submitLabel: string;
  onSubmit: (profile: UserProfile) => void;
};

/** Name + avatar fields, shared by onboarding (create-profile) and the Profile tab's edit mode. */
export function ProfileForm({ initialProfile, submitLabel, onSubmit }: ProfileFormProps) {
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [avatar, setAvatar] = useState(initialProfile?.avatar ?? AVATAR_OPTIONS[0]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), avatar });
  };

  return (
    <View style={styles.container}>
      <Text style={gardenText.muted}>Como podemos te chamar?</Text>
      <TextInput
        style={styles.input}
        placeholder="Seu nome"
        placeholderTextColor={Garden.label}
        value={name}
        onChangeText={setName}
      />

      <Text style={[gardenText.muted, styles.label]}>Escolha um avatar</Text>
      <AvatarPicker value={avatar} onChange={setAvatar} />

      <GardenButton label={submitLabel} onPress={handleSubmit} disabled={!name.trim()} style={styles.submit} />
    </View>
  );
}

export const gardenInput = {
  borderWidth: 1,
  borderColor: Garden.hillBack,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: Spacing.three,
  fontSize: 16,
  color: Garden.text,
} as const;

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  input: gardenInput,
  label: { marginTop: Spacing.three },
  submit: { marginTop: Spacing.four },
});
