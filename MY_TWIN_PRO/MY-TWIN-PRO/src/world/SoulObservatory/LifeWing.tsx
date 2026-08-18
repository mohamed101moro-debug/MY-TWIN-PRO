import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { apiGet } from '../../../lib/httpClient';
import { useRTL } from '../../../lib/useRTL';
export default function LifeWing() {
  const rtl = useRTL();
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    (async () => {
      try {
        const [tl, nar, bel, con, aut] = await Promise.all([
          apiGet('/api/self/timeline'), apiGet('/api/self/narrative'), apiGet('/api/self/beliefs'),
          apiGet('/api/self/constitution'), apiGet('/api/self/autonomy'),
        ]);
        setD({ ev: (tl as any)?.events || [], nar: (nar as any)?.narrative || '', bel: (bel as any)?.beliefs || [], w: (con as any)?.weights || {}, aut: (aut as any) || null });
      } catch {}
    })();
  }, []);
  if (!d) return <Text style={s.dim}>…أسترجع حياتنا</Text>;
  return (
    <View>
      <Text style={s.title}>{rtl.isRTL ? 'حياتي' : 'My Life'}</Text>
      <Text style={s.nar}>{d.nar}</Text>
      {d.aut && <Text style={s.line}>🤝 {rtl.isRTL ? 'استقلاليتي' : 'Autonomy'}: L{d.aut.level} — {d.aut.label}</Text>}
      <Text style={s.h}>{rtl.isRTL ? 'ما أؤمن به عنك' : 'What I believe about you'}</Text>
      {d.bel.slice(0, 5).map((b: any, i: number) => (
        <Text key={i} style={s.line}>• {b.text} ({Math.round((b.confidence || 0.5) * 100)}%)</Text>
      ))}
      <Text style={s.h}>{rtl.isRTL ? 'دستوري' : 'My constitution'}</Text>
      {Object.entries(d.w).map(([k, v]: any) => (
        <Text key={k} style={s.line}>{k}: {'▮'.repeat(Math.round(v * 10))} {Math.round(v * 100)}%</Text>
      ))}
      <Text style={s.h}>{rtl.isRTL ? 'آخر نبضات حياتي' : 'Latest life beats'}</Text>
      {d.ev.slice(0, 8).map((e: any, i: number) => (
        <Text key={i} style={s.dim}>{e.type} • {String(e.ts || '').slice(5, 16)}</Text>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  title: { color: '#E8E0F0', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  nar: { color: '#C9B8E8', fontSize: 14, marginBottom: 10 },
  h: { color: '#A855F7', fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  line: { color: '#C9B8E8', fontSize: 12, marginBottom: 3 },
  dim: { color: '#6B5B8A', fontSize: 11, marginBottom: 3 },
});
