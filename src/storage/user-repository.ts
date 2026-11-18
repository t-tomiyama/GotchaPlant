import { getJson, removeItem, setJson } from './json-storage';
import { StorageKeys } from './storage-keys';

import type { UserProfile } from '@/types/user';

export function getUserProfile(): Promise<UserProfile | null> {
  return getJson<UserProfile>(StorageKeys.userProfile);
}

export function saveUserProfile(profile: UserProfile): Promise<void> {
  return setJson(StorageKeys.userProfile, profile);
}

export function clearUserProfile(): Promise<void> {
  return removeItem(StorageKeys.userProfile);
}
