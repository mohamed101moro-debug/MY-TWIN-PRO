import { apiGet, apiPut } from '../../lib/httpClient';

export type PushSettings = {
  sound_enabled: boolean;
  vibration_enabled: boolean;
  proactive_enabled: boolean;
  categories: string[];
};

const DEFAULT_SETTINGS: PushSettings = {
  sound_enabled: true,
  vibration_enabled: true,
  proactive_enabled: false,
  categories: ['general'],
};

export async function getPushSettings(): Promise<PushSettings> {
  const response = await apiGet('/api/push/settings');
  const value = response?.settings ?? {};
  return {
    sound_enabled: value.sound_enabled !== false,
    vibration_enabled: value.vibration_enabled !== false,
    proactive_enabled: value.proactive_enabled === true,
    categories: Array.isArray(value.categories) ? value.categories.filter((item: unknown): item is string => typeof item === 'string') : DEFAULT_SETTINGS.categories,
  };
}

export async function savePushSettings(settings: PushSettings): Promise<void> {
  await apiPut('/api/push/settings', settings);
}
