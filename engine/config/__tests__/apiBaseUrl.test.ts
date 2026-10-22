import { resolveApiBaseUrl } from '../apiBaseUrl';

describe('resolveApiBaseUrl', () => {
  it('prefers an explicit environment override for preview/staging', () => {
    expect(
      resolveApiBaseUrl('https://staging.example.test/', 'api.example.test'),
    ).toBe('https://staging.example.test');
  });

  it('uses Expo app config when no environment override is supplied', () => {
    expect(resolveApiBaseUrl(undefined, 'my-twin-pro-production-fd77.up.railway.app/'))
      .toBe('https://my-twin-pro-production-fd77.up.railway.app');
  });

  it('uses the production fallback only when no configured URL exists', () => {
    expect(resolveApiBaseUrl('', undefined))
      .toBe('https://my-twin-pro-production-fd77.up.railway.app');
  });

  it('rejects non-http schemes and query strings', () => {
    expect(() => resolveApiBaseUrl('ftp://api.example.test')).toThrow(
      'Invalid API base URL configuration',
    );
    expect(() => resolveApiBaseUrl('https://api.example.test?target=prod')).toThrow(
      'Invalid API base URL configuration',
    );
  });

  it('ignores values with an unsupported shape and uses the documented fallback', () => {
    expect(resolveApiBaseUrl(undefined, { host: 'api.example.test' }))
      .toBe('https://my-twin-pro-production-fd77.up.railway.app');
  });
});
