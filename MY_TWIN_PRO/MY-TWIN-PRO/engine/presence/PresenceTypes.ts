/** PresenceTypes v2.1 — الدستور النوعي الموحّد (+ conversationState لآلة المحادثة الخماسية) */
export interface RGB { r: number; g: number; b: number; }
export interface PresenceState {
  emotion?: string; intensity?: number;
  energy?: number; pulse?: number; breathing?: number;
  ambientLight?: number; motion?: number; proximity?: number;
  batteryLevel?: number; isCharging?: boolean; performanceTier?: number;
  reducedMotion?: boolean; gazeLock?: boolean;
  eyeOpenness?: number; eyeGlow?: number; pupilSize?: number; gazeX?: number; gazeY?: number;
  warmth?: number; attention?: number; anticipation?: number;
  voiceLevel?: number; speaking?: boolean; listening?: boolean; thinking?: boolean;
  fieldSpeed?: number; turbulence?: number; orbitality?: number; fieldRadius?: number; fieldOpacity?: number;
  colorA?: RGB; colorB?: RGB; eyeColor?: RGB;
  userPresent?: boolean; micro?: string;
  conversationState?: 'idle' | 'listening' | 'processing' | 'understanding' | 'responding';
}
export type PresenceStateV2 = PresenceState;
