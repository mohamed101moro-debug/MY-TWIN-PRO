import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { unifiedBrainBridge } from '../../core/UnifiedBrainBridge';
import { stateBus } from '../../core/StateBus';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Heart, Brain, Sparkles, TrendingUp, Zap } from 'lucide-react-native';

export default function SoulWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [soul, setSoul] = useState<any>(null);
  const [bond, setBond] = useState(0);
  const [phase, setPhase] = useState('stranger');
  const [personalityDNA, setPersonalityDNA] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSoul = async () => {
      try {
        // 1. حالة الروح من الدماغ الموحد
        const twinState = await unifiedBrainBridge.getTwinState();
        setSoul(twinState?.soul_state || {});
        setPersonalityDNA(twinState?.twin_state_update?.personality_dna || {});

        // 2. العلاقة من StateBus
        const rel = stateBus.getState().relationship;
        setBond(rel.bondLevel);
        const phaseCalc = rel.bondLevel >= 95 ? 'soulmate' : rel.bondLevel >= 80 ? 'close_friend' : rel.bondLevel >= 40 ? 'friend' : 'stranger';
        setPhase(phaseCalc);
      } catch (e) {
        // قيم افتراضية عند الفشل
        const rel = stateBus.getState().relationship;
        setBond(rel.bondLevel);
        setPhase('friend');
      } finally {
        setLoading(false);
      }
    };
    loadSoul();
  }, []);

  const traits = [
    { label: rtl.isRTL ? 'تعاطف' : 'Empathy', value: personalityDNA.empathy || 0.85, color: colors.rose },
    { label: rtl.isRTL ? 'فضول' : 'Curiosity', value: personalityDNA.curiosity || 0.8, color: colors.accent },
    { label: rtl.isRTL ? 'حماية' : 'Protective', value: (personalityDNA.calmness || 0.85) * 0.8 + 0.2, color: '#3B82F6' },
    { label: rtl.isRTL ? 'تأمل' : 'Reflective', value: personalityDNA.reflection || 0.9, color: colors.success },
    { label: rtl.isRTL ? 'مرح' : 'Playful', value: personalityDNA.humor || 0.5, color: colors.gold },
    { label: rtl.isRTL ? 'توازن' : 'Balanced', value: (personalityDNA.logic || 0.75) * 0.6 + (personalityDNA.calmness || 0.85) * 0.4, color: '#6366F1' },
  ];

  const coreValues = soul?.values?.values || ['التعاطف', 'الفضول', 'الصدق'];
  const signature = soul?.signature?.fingerprint || '';
  const harmony = soul?.resonance?.harmony || 0.5;
  const syncLevel = soul?.resonance?.sync_level || 'moderate';
  const role = soul?.core?.phase_ar || (rtl.isRTL ? 'مراقب' : 'Observer');
  const roleEn = soul?.core?.phase_en || 'Observer';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: colors.rose + '20' }]}>
          <Heart size={32} stroke={colors.rose} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          {rtl.isRTL ? role : roleEn}
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          {rtl.isRTL ? 'الرابطة:' : 'Bond:'} {bond}% · {phase === 'soulmate' ? '💫' : phase === 'close_friend' ? '💜' : '🤍'}
        </Text>
      </View>

      {/* Personality Traits */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'شخصيتي' : 'My Personality'}</Text>
        <View style={styles.traitsGrid}>
          {traits.map((trait, i) => (
            <View key={i} style={styles.traitItem}>
              <View style={styles.traitHeader}>
                <Text style={[styles.traitLabel, { color: colors.text }]}>{trait.label}</Text>
                <Text style={[styles.traitValue, { color: trait.color }]}>{Math.round(trait.value * 100)}%</Text>
              </View>
              <View style={[styles.traitTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.traitFill, { width: `${trait.value * 100}%`, backgroundColor: trait.color }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Core Values */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'قيمي' : 'My Values'}</Text>
        <View style={styles.valuesRow}>
          {coreValues.map((value: string, i: number) => (
            <View key={i} style={[styles.valueChip, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
              <Sparkles size={12} stroke={colors.accent} />
              <Text style={[styles.valueText, { color: colors.accent }]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Soul Signature */}
      <View style={[styles.signatureCard, { backgroundColor: colors.accent + '15' }]}>
        <Text style={[styles.signatureTitle, { color: colors.accent }]}>{rtl.isRTL ? 'بصمتي' : 'My Signature'}</Text>
        <Text style={[styles.signatureText, { color: colors.text }]}>
          {rtl.isRTL ? 'أنا كيان فريد.' : 'I am a unique entity.'}
        </Text>
        <Text style={[styles.signatureFingerprint, { color: colors.textSecondary }]}>{signature.substring(0, 16)}</Text>
      </View>

      {/* Harmony */}
      <View style={[styles.harmonyCard, { backgroundColor: colors.success + '15' }]}>
        <Text style={[styles.harmonyTitle, { color: colors.success }]}>{rtl.isRTL ? 'الانسجام' : 'Harmony'}</Text>
        <Text style={[styles.harmonyValue, { color: colors.success }]}>{Math.round(harmony * 100)}%</Text>
        <Text style={[styles.harmonyLabel, { color: colors.textSecondary }]}>{syncLevel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.lg },
  hero: { alignItems: 'center', paddingVertical: SPACE.lg },
  heroIcon: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: SPACE.md },
  heroTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  heroSubtitle: { fontSize: 14, marginTop: 6 },
  section: { gap: SPACE.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  traitsGrid: { gap: SPACE.sm },
  traitItem: { gap: 4 },
  traitHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  traitLabel: { fontSize: 13, fontWeight: '500' },
  traitValue: { fontSize: 12, fontWeight: '700' },
  traitTrack: { height: 6, borderRadius: 3 },
  traitFill: { height: 6, borderRadius: 3 },
  valuesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  valueChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1 },
  valueText: { fontSize: 13, fontWeight: '600' },
  signatureCard: { borderRadius: RADIUS.card, padding: SPACE.md, alignItems: 'center', gap: 6 },
  signatureTitle: { fontSize: 14, fontWeight: '700' },
  signatureText: { fontSize: 14, textAlign: 'center' },
  signatureFingerprint: { fontSize: 12, fontFamily: 'monospace' },
  harmonyCard: { borderRadius: RADIUS.card, padding: SPACE.md, alignItems: 'center', gap: 4 },
  harmonyTitle: { fontSize: 14, fontWeight: '700' },
  harmonyValue: { fontSize: 28, fontWeight: '800' },
  harmonyLabel: { fontSize: 12 },
});
