/**
 * VisualState v3 — one deterministic projection from PresenceState to renderer state.
 * No visual field is an authority over identity, memory, emotion, continuity or action.
 */
import { mapEmotion } from './EmotionToVisualMapper';
import { deriveEnergyMode, normalizeVisualEmotion, VISUAL_ENTITY_CONTRACT_VERSION } from './VisualEntityContract';
import { deriveVisualPerformanceProfile } from './VisualPerformancePolicy';
import type { EmotionVisualProfile } from './EmotionToVisualMapper';
import type { PresenceState } from './PresenceTypes';

const c01 = (n:number,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const c11 = (n:number)=>Math.max(-1,Math.min(1,Number.isFinite(n)?n:0));
const toHex=(c:{r:number;g:number;b:number})=>'#'+[c.r,c.g,c.b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('').toUpperCase();

export interface VisualState {
  contractVersion:string; energyMode:'sleep'|'normal'|'high_energy';
  energy:number; breathing:number; pulse:number; awaken:number; fieldSpeed:number; turbulence:number; orbitality:number; fieldRadius:number; ambientLight:number;
  colorA:string; colorB:string; glowColor:string; irisA:string; irisB:string; eyeOpenness:number; eyeGlow:number; pupilSize:number; gazeX:number; gazeY:number;
  warmth:number; attention:number; anticipation:number; browRaise:number; tearOpacity:number; squint:number; thinkingMul:number; mouthCurve:number;
  auraIntensity:number; haloOpacity:number; particleCount:number; particleSpeed:number; coreGlow:number; blurMod:number;
  gazeLock:boolean; voiceLevel:number; listening:boolean; speaking:boolean; thinking:boolean; emotion:string; convState:string; performanceTier:number; userPresent:boolean;
  performanceMode:'ultra'|'high'|'balanced'|'low'; targetFps:30|45|60; animationScale:number; reducedMotion:boolean; theme:'light'|'dark'; accessibilityMode:'full'|'reduced_motion';
}

export function buildVisualState(presence:PresenceState|null,_legacyEnv?:unknown,awaken=1,theme:'light'|'dark'='dark'):VisualState{
 const p=presence??{};
 const emotion=normalizeVisualEmotion(p.emotion);
 const convState=p.conversationState??(p.speaking?'responding':p.thinking?'processing':p.listening?'listening':'idle');
 const P:EmotionVisualProfile=mapEmotion(emotion);
 const energy=c01((p.energy??0.55)+(P.energyBias??0)*0.3);
 const light=c01(p.ambientLight??0.5);
 const envGlow=light<0.12?1.12:light>0.8?0.82:1;
 const perf=deriveVisualPerformanceProfile(p);
 const calm=convState==='processing'||emotion==='sleepy'||emotion==='thinking';
 const motion=c01(p.motion??0);
 const proximity=c01(p.proximity??0.5);
 const motionScale=perf.reducedMotion?0.22:perf.tier==='low'?0.65:perf.animationScale;
 const fieldSpeed=c01((P.fieldSpeed??0.4)*(p.speaking?1.3:p.thinking?0.5:1)*(convState==='processing'?1.4:1)*motionScale,0.05,2);
 return {
  contractVersion: VISUAL_ENTITY_CONTRACT_VERSION, energyMode: deriveEnergyMode(energy, emotion),
  energy,breathing:c01((P.breathRate??0.4)*(calm?0.9:1)*motionScale),pulse:c01((P.pulseRate??0.4)+(convState==='processing'?0.25:convState==='responding'?0.2:0)),awaken:c01(awaken),
  fieldSpeed,turbulence:c01((P.turbulence??0.18)*(0.85+motion*0.5)*motionScale,0.02,1),orbitality:c01(P.orbitality??0.68,0.2,0.95),fieldRadius:c01((p.fieldRadius??1)*(1+proximity*0.12),0.5,1.7),ambientLight:light,
  colorA:P.primary,colorB:P.secondary,glowColor:P.glow,irisA:toHex(P.eyeColor),irisB:P.secondary,
  eyeOpenness:c01((P.eyeOpenness??0.85)*(convState==='listening'?1.05:1),0.05,1.2),eyeGlow:c01((P.eyeGlow??0.88)*envGlow),pupilSize:c01((P.pupilSize??0.42)+(1-light)*0.15),
  gazeX:p.gazeLock?0:c11(p.gazeX??0),gazeY:p.gazeLock?0:c11(p.gazeY??0),warmth:c01(p.warmth??P.warmth??0.35),attention:c01(p.attention??P.attention??0.5),anticipation:c01(p.anticipation??P.anticipation??0.25),
  browRaise:P.browRaise??0.1,tearOpacity:P.key==='sad'?0.6:0,squint:P.key==='angry'?0.4:0,thinkingMul:p.thinking?0.72:1,mouthCurve:P.mouthCurve??0.3,
  auraIntensity:c01((P.auraIntensity??0.5)*(0.7+energy*0.5)*envGlow),haloOpacity:c01(0.25+energy*0.35),particleCount:Math.round(Math.min(perf.particleBudget,80+energy*120+(p.anticipation??0.25)*50)*perf.normalizedTier),
  particleSpeed:c01(fieldSpeed*(calm?0.82:1),0.05,2),coreGlow:c01(0.4+energy*0.4+(convState==='processing'?0.25:0)+(convState==='responding'?0.2:0)),blurMod:envGlow*perf.blurScale,
  gazeLock:!!p.gazeLock,voiceLevel:c01(p.voiceLevel??0),listening:!!p.listening,speaking:!!p.speaking,thinking:!!p.thinking,emotion,convState,performanceTier:perf.normalizedTier,userPresent:!!p.userPresent,
  performanceMode:perf.tier,targetFps:perf.targetFps,animationScale:motionScale,reducedMotion:perf.reducedMotion,theme,accessibilityMode:perf.reducedMotion?'reduced_motion':'full',
 };
}
export function visualStatesEqual(a:VisualState,b:VisualState){return a.emotion===b.emotion&&a.convState===b.convState&&Math.abs(a.energy-b.energy)<0.02&&Math.abs(a.ambientLight-b.ambientLight)<0.04&&Math.abs(a.pulse-b.pulse)<0.03&&a.reducedMotion===b.reducedMotion&&a.performanceMode===b.performanceMode;}
