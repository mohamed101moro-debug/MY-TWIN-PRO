export interface RGB { r: number; g: number; b: number; }
export type ConversationState = 'idle' | 'listening' | 'processing' | 'understanding' | 'responding';
export interface PresenceState {
  emotion?: string; intensity?: number; emotionSource?: string; emotionUpdatedAt?: number;
  energy?: number; pulse?: number; breathing?: number; eyeOpenness?: number; eyeGlow?: number; pupilSize?: number; gazeX?: number; gazeY?: number;
  warmth?: number; attention?: number; anticipation?: number; voiceLevel?: number; speaking?: boolean; listening?: boolean; thinking?: boolean;
  fieldSpeed?: number; turbulence?: number; orbitality?: number; fieldRadius?: number; fieldOpacity?: number;
  colorA?: RGB; colorB?: RGB; eyeColor?: RGB; userPresent?: boolean; micro?: string; conversationState?: ConversationState;
  ambientLight?: number; noise?: number; motion?: number; proximity?: number; night?: boolean; camera?: boolean; gazeLock?: boolean;
  batteryLevel?: number; isCharging?: boolean; performanceTier?: number; reducedMotion?: boolean;
}
export type PresenceStateV2 = PresenceState;
