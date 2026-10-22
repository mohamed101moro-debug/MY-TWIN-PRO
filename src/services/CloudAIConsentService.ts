import { apiGet, apiPut } from '../../lib/httpClient';

export type CloudAIProviderConsent = {
  key: string;
  name: string;
  granted: boolean;
  effective: boolean;
};

export type CloudAIPurposeConsent = {
  key: 'text_generation' | 'image_generation' | 'image_analysis' | 'image_editing' | 'voice_synthesis' | 'audio_transcription' | 'memory_embedding';
  title: string;
  description: string;
  providers: CloudAIProviderConsent[];
};

export type CloudAIConsentSnapshot = {
  policy_version: string;
  policy_approved: boolean;
  grants_available: boolean;
  purposes: CloudAIPurposeConsent[];
};

export async function getCloudAIConsents(): Promise<CloudAIConsentSnapshot> {
  return apiGet('/api/privacy/cloud-ai');
}

export async function setCloudAIConsent(
  purpose: CloudAIPurposeConsent['key'],
  provider: string,
  granted: boolean,
  policyVersion: string,
): Promise<void> {
  await apiPut('/api/privacy/cloud-ai', {
    purpose,
    provider,
    granted,
    policy_version: policyVersion,
  });
}
