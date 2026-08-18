let client: any = null;
export function initAnalytics() {
  try {
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
    if (key) { const { PostHog } = require('posthog-react-native'); client = new PostHog(key, { host: 'https://app.posthog.com' }); }
  } catch {}
}
export function track(event: string, props?: Record<string, any>) { try { client?.capture(event, props); } catch {} }
