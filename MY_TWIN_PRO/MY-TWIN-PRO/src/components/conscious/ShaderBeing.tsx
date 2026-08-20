import React from 'react';
import { Canvas, Rect, Shader, useClockValue, useComputedValue } from '@shopify/react-native-skia';
import type { PresenceState } from '../../../engine/presence/PresenceTypes';
/** ShaderBeing v1 — كيان Volumetric حقيقي: كرة 3D + غشاء fbm + تقزح + جسيمات 3D + عيون shader. */
const SOURCE = `
uniform float2 size;
uniform float time; uniform float energy; uniform float turbulence; uniform float voice;
uniform float anticipation; uniform float awaken; uniform float eyeOpen; uniform float gazeX; uniform float gazeY;
uniform float3 colorA; uniform float3 colorB; uniform float3 eyeColor;
float hash(float2 p){ return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123); }
float vnoise(float2 p){ float2 i = floor(p); float2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+float2(1.0,0.0)), f.x), mix(hash(i+float2(0.0,1.0)), hash(i+float2(1.0,1.0)), f.x), f.y); }
float fbm(float2 p){ float v = 0.0; float a = 0.5; for(int i=0;i<4;i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; } return v; }
half4 main(float2 xy){
  float R = 0.32 * min(size.x, size.y);
  float2 uv = (xy - 0.5*size) / R;
  float r = length(uv);
  float t = time;
  float3 col = float3(0.0);
  float glow = exp(-max(r - 1.0, 0.0) * 2.4) * (0.35 + 0.45*energy + 0.35*voice);
  float inside = 1.0 - smoothstep(0.97, 1.0, r);
  float z = sqrt(max(1.0 - r*r, 0.0));
  float3 n = normalize(float3(uv.x, uv.y, z));
  float2 sph = n.xy * (2.0 + n.z);
  float mem = fbm(sph*2.0 + float2(t*0.16, -t*0.11));
  float fil = smoothstep(0.5, 0.8, fbm(sph*4.5 - t*0.22));
  float bands = 0.5 + 0.5*sin(r*7.0 - t*1.3 + mem*3.5 + turbulence*5.0*vnoise(uv*3.0 + t*0.35));
  float fres = pow(1.0 - z, 2.0);
  float ang = atan(uv.y, uv.x);
  float3 irid = 0.5 + 0.5*cos(6.28318*(0.35*fres + 0.2*mem) + float3(0.0, 2.1, 4.2) + ang + t*0.35);
  float3 base = mix(colorA, colorB, 0.5 + 0.5*sin(ang*2.0 + t*0.4));
  float3 sc = mix(base, irid, 0.30 + 0.40*fres);
  sc += fil * 0.35 * mix(colorB, float3(1.0), 0.35);
  sc += bands * 0.14 * colorA;
  sc += fres * mix(colorB, float3(1.0), 0.55) * 0.9;
  float3 L = normalize(float3(-0.45, -0.5, 0.75));
  sc *= 0.55 + 0.45*max(dot(n, L), 0.0);
  float core = exp(-r*r*6.5) * (0.75 + 0.25*sin(t*2.6*(0.5+voice)));
  sc += core * mix(float3(1.0), colorB, 0.35) * (0.7 + 0.6*energy);
  col += sc * inside;
  for(int i=0;i<16;i++){
    float fi = float(i);
    float spd = 0.25 + 0.06*hash(float2(fi, 1.7));
    float a2 = fi*2.39996 + t*spd*(0.6+energy);
    float rad = 1.2 + 0.55*hash(float2(fi, 3.1));
    float3 pp = float3(cos(a2)*rad, sin(a2)*rad*0.6, sin(a2*1.31 + fi)*0.6);
    float d = length(uv - pp.xy);
    float tw = 0.5 + 0.5*sin(t*2.0 + fi*7.3);
    float depth = pp.z > 0.0 ? 1.0 : 0.45;
    col += mix(colorB, float3(1.0), 0.45) * exp(-d*d*1100.0) * (0.3+0.7*tw) * depth * (0.45 + 0.75*anticipation);
  }
  float bl = pow(max(0.0, sin(t*0.83)), 42.0) + 0.6*pow(max(0.0, sin(t*0.41+2.0)), 60.0);
  float open = clamp(eyeOpen, 0.08, 1.15) * (1.0 - clamp(bl,0.0,1.0)*0.92);
  for(int s2=0;s2<2;s2++){
    float sx = s2==0 ? -1.0 : 1.0;
    float2 e = float2(sx*0.40, -0.08) + float2(gazeX*0.07, gazeY*0.05);
    float2 q = uv - e;
    float almond = length(q * float2(1.0, 1.0/max(open, 0.10)));
    float eyeM = (1.0 - smoothstep(0.30, 0.34, almond)) * inside;
    float2 iq = q - float2(gazeX*0.03, gazeY*0.02);
    float iris = 1.0 - smoothstep(0.13, 0.15, length(iq));
    float pupil = 1.0 - smoothstep(0.06, 0.07, length(iq));
    float spark = 1.0 - smoothstep(0.02, 0.026, length(q - float2(-0.035, -0.035)));
    float3 ec = mix(eyeColor, colorB, 0.25);
    col = mix(col, ec*1.25, eyeM*0.9);
    col = mix(col, mix(ec, colorB, 0.5), eyeM*iris*0.9);
    col = mix(col, float3(0.03), eyeM*iris*pupil);
    col = mix(col, float3(1.0), eyeM*spark);
  }
  col += glow * mix(colorA, colorB, 0.5);
  float alpha = clamp(inside + glow*0.9, 0.0, 1.0);
  return half4(col*awaken, alpha*awaken);
}`;
export default function ShaderBeing({ presence, size = 280, awaken = 1 }: { presence: PresenceState | null; size?: number; awaken?: number }) {
  const clock = useClockValue();
  const p = presence;
  const uniforms = useComputedValue(() => ({
    size: [size, size],
    time: clock.value / 1000,
    energy: p?.energy ?? 0.55,
    turbulence: p?.turbulence ?? 0.18,
    voice: p?.voiceLevel ?? 0,
    anticipation: p?.anticipation ?? 0.25,
    awaken,
    eyeOpen: p?.eyeOpenness ?? 0.85,
    gazeX: p?.gazeX ?? 0,
    gazeY: p?.gazeY ?? 0,
    colorA: [(p?.colorA?.r ?? 155) / 255, (p?.colorA?.g ?? 111) / 255, (p?.colorA?.b ?? 255) / 255],
    colorB: [(p?.colorB?.r ?? 70) / 255, (p?.colorB?.g ?? 139) / 255, (p?.colorB?.b ?? 255) / 255],
    eyeColor: [(p?.eyeColor?.r ?? 245) / 255, (p?.eyeColor?.g ?? 242) / 255, (p?.eyeColor?.b ?? 255) / 255],
  }), [clock, p, size, awaken]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={0} y={0} width={size} height={size}>
        <Shader source={SOURCE} uniforms={uniforms as any} />
      </Rect>
    </Canvas>
  );
}
