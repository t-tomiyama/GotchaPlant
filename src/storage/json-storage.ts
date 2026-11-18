import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin AsyncStorage wrapper so every repository reads/writes JSON the same
 * way and logs failures in one place instead of each call site.
 */
export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.log(`Erro ao ler "${key}" do armazenamento:`, e);
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.log(`Erro ao salvar "${key}" no armazenamento:`, e);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.log(`Erro ao remover "${key}" do armazenamento:`, e);
  }
}
