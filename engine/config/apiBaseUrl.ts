const DEFAULT_API_BASE_URL = 'https://my-twin-pro-production.up.railway.app';

/**
 * Resolve the backend URL in a deterministic order:
 * EAS/public environment override -> Expo app config -> production fallback.
 * A scheme-less host in app config is treated as HTTPS for compatibility with
 * the existing `extra.API_URL` value.
 */
export function resolveApiBaseUrl(
  environmentUrl?: string,
  appConfigUrl?: unknown,
): string {
  const configuredUrl = [environmentUrl, appConfigUrl].find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && candidate.trim().length > 0,
  );

  if (!configuredUrl) return DEFAULT_API_BASE_URL;

  const trimmed = configuredUrl.trim();
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  // API_BASE_URL is a service origin/prefix, not a URL carrying request data.
  if (!/^https?:\/\/[^\s/?#]+(?:\/[^?#]*)?$/i.test(withScheme)) {
    throw new Error('Invalid API base URL configuration');
  }

  return withScheme.replace(/\/+$/, '');
}
