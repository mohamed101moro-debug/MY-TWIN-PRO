#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/validate_expo_config.cjs <expo-config-json>');
  process.exit(2);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch {
  console.error('Expo config validation failed: input is not valid JSON.');
  process.exit(2);
}

const projectId = config?.extra?.eas?.projectId;
const updatesUrl = config?.updates?.url;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (typeof projectId !== 'string' || !uuidPattern.test(projectId)) {
  console.error('Expo config validation failed: extra.eas.projectId must be a valid UUID.');
  process.exit(1);
}

let updatesProjectId;
try {
  const url = new URL(updatesUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'u.expo.dev' || url.search || url.hash) {
    throw new Error('invalid EAS update URL');
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 1 || !uuidPattern.test(segments[0])) {
    throw new Error('invalid EAS update project ID');
  }
  updatesProjectId = segments[0];
} catch {
  console.error('Expo config validation failed: updates.url must be https://u.expo.dev/<project-uuid>.');
  process.exit(1);
}

if (projectId.toLowerCase() !== updatesProjectId.toLowerCase()) {
  console.error('Expo config validation failed: extra.eas.projectId and updates.url identify different EAS projects. Confirm the canonical project ID before building or publishing updates.');
  process.exit(1);
}

console.log('Expo config valid: EAS projectId matches updates.url.');
