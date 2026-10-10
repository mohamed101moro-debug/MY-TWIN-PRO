export const AUDIO_CATEGORY = { layer: 'layer', one_shot: 'one_shot', loop: 'loop' } as const;
export const AUDIO_GROUPS = {
  awakening: 'awakening', thinking: 'thinking', memory: 'memory',
  relationship: 'relationship', workspace: 'workspace', ui: 'ui',
} as const;

export const AUDIO_VOLUMES = {
  layer: {
    silence_room: 0.08, ambience_space: 0.10, breathing_loop: 0.06,
    heartbeat_energy: 0.05, energy_hum: 0.07,
  },
  one_shot: {
    startup_birth: 0.25, first_breath: 0.18, awakening_glow: 0.15,
    eyes_open: 0.10, particles: 0.12,
    message_sent: 0.15, thinking_start: 0.12, response_ready: 0.15,
    memory_found: 0.14, memory_store: 0.07, memory_whisper: 0.10,
    trust_up: 0.18, milestone: 0.22, bond_pulse: 0.16,
    workspace_enter: 0.12, workspace_exit: 0.10, workspace_transform: 0.11,
    typing: 0.08, success_soft: 0.12, error_soft: 0.10, notification_soft: 0.10,
  },
  loop: { reasoning_loop: 0.06, neural_hum: 0.05 },
} as const;

export const AUDIO_FILES = {
  silence_room: 'silence_room', ambience_space: 'ambience_space',
  breathing_loop: 'breathing_loop', heartbeat_energy: 'heartbeat_energy',
  energy_hum: 'energy_hum',
  startup_birth: 'startup_birth', first_breath: 'first_breath',
  awakening_glow: 'awakening_glow', eyes_open: 'eyes_open', particles: 'particles',
  message_sent: 'message_sent', thinking_start: 'thinking_start',
  reasoning_loop: 'reasoning_loop', neural_hum: 'neural_hum', response_ready: 'response_ready',
  memory_found: 'memory_found', memory_store: 'memory_store', memory_whisper: 'memory_whisper',
  trust_up: 'trust_up', milestone: 'milestone', bond_pulse: 'bond_pulse',
  workspace_enter: 'workspace_enter', workspace_exit: 'workspace_exit',
  workspace_transform: 'workspace_transform',
  typing: 'typing', success_soft: 'success_soft', error_soft: 'error_soft',
  notification_soft: 'notification_soft',
} as const;
