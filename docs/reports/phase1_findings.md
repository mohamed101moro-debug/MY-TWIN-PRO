# Phase 1 Findings

- Files inventoried: 1146
- TypeScript errors: 0 (exit 0)
- Backend imports: all successful (exit 0)
- Routers registered: 18 (auth, chat, memories, profile, study,
  code_lab, business, creator, dream, life_coach, image_lab,
  smart_home, task_manager, economy, ads, billing, referral,
  unified_chat)
- Duplicate chat paths: chat + unified_chat (must pick one)
- Ads SDK present: react-native-google-mobile-ads (must remove per decision #2)
- DB migrations: NONE in repo (critical gap)
- Sensitive perms deps: camera, face-detector, sensors, location,
  local-authentication, media-library, onesignal
- Deprecated: sentry-expo (keep @sentry/react-native only)
- Note: llmnext present (candidate for offline local model)


## Local remediation status — 2026-10-08

The bullets above are the **pre-remediation baseline**, not a current release-gate result. Local changes in the working copy have since removed the AdMob dependency/plugin and ad UI/service files, disabled legacy ad rewards and untracked free trials, made server-verified Google Play billing routes canonical, and disabled automatic camera/location/sensor/microphone collection and unapproved cloud perception payloads. The actual post-change TypeScript, backend, native-config and release-build gates remain to be run; none of these local changes have been deployed or applied to a live database.
