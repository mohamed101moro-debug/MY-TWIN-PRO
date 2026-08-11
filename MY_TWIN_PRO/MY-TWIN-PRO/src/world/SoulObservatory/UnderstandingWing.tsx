import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { unifiedBrainBridge } from '../../core/UnifiedBrainBridge';
import { stateBus } from '../../core/StateBus';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Brain, Eye, Heart, TrendingUp, Lightbulb } from 'lucide-react-native';

export default function UnderstandingWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [insights, setInsights] = useState<Array<{ icon: any; text: string; color: string }>>([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnderstanding = async () => {
      try {
        // 1. الهوية من الدماغ الموحد
        const twinState = await unifiedBrainBridge.getTwinState();
        const soulCore = twinState?.soul_state?.core || {};
        const identityRole = soulCore?.role || 'observer';
        const phaseAr = soulCore?.phase_ar || 'مراقب';
        setRole(phaseAr);

        // 2. الذاكرة من TCMA
        const memoryCount = await unifiedBrainBridge.getMemoryCount();

        // 3. العلاقة من StateBus
        const bondLevel = stateBus.getState().relationship.bondLevel;
        const attachmentStyle = bondLevel >= 80 ? 'آمنة' : bondLevel >= 40 ? 'تنمو' : 'تبدأ';
        const tone = bondLevel >= 80 ? 'عميق ودافئ' : bondLevel >= 40 ? 'ودود' : 'لطيف';

        const loadedInsights = [
          { 
            icon: Eye, 
            text: rtl.isRTL ? `أراك ${phaseAr}.` : `I see you as ${identityRole}.`, 
            color: colors.accent 
          },
          { 
            icon: Heart, 
            text: rtl.isRTL ? `أسلوب التواصل: ${tone}.` : `Communication style: ${tone}.`, 
            color: colors.rose 
          },
          { 
            icon: Brain, 
            text: rtl.isRTL ? `أعرف عنك ${memoryCount} شيء.` : `I know ${memoryCount} things about you.`, 
            color: '#3B82F6' 
          },
          { 
            icon: TrendingUp, 
            text: rtl.isRTL ? `الرابطة: ${attachmentStyle}.` : `Bond: ${attachmentStyle}.`, 
            color: colors.success 
          },
          { 
            icon: Lightbulb, 
            text: rtl.isRTL ? `أهم ما يهمني: ${twinState?.twin_emotional_state?.cultural_analysis || 'أنت'}.\n` : `What matters most: ${twinState?.twin_emotional_state?.cultural_analysis || 'you'}.`, 
            color: colors.gold 
          },
        ];

        setInsights(loadedInsights);
      } catch (e) {
        const bondLevel = stateBus.getState().relationship.bondLevel;
        const tone = bondLevel >= 80 ? 'عميق ودافئ' : bondLevel >= 40 ? 'ودود' : 'لطيف';
        
        setInsights([
          { icon: Eye, text: rtl.isRTL ? 'أراك شخصاً مميزاً.' : 'I see you as someone special.', color: colors.accent },
          { icon: Heart, text: rtl.isRTL ? `أسلوب التواصل: ${tone}.` : `Communication style: ${tone}.`, color: colors.rose },
          { icon: Brain, text: rtl.isRTL ? 'أعرف عنك القليل بعد.' : 'I know a little about you yet.', color: '#3B82F6' },
          { icon: TrendingUp, text: rtl.isRTL ? 'الرابطة: تبدأ.' : 'Bond: beginning.', color: colors.success },
          { icon: Lightbulb, text: rtl.isRTL ? 'أهم ما يهمني: أنت.' : 'What matters most: you.', color: colors.gold },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadUnderstanding();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: '#3B82F620' }]}>
          <Brain size={32} stroke="#3B82F6" />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          {rtl.isRTL ? 'هكذا أراك' : 'This is how I see you'}
        </Text>
      </View>

      {insights.map((insight, i) => {
        const Icon = insight.icon;
        return (
          <View key={i} style={[styles.insightCard, { backgroundColor: colors.card, borderColor: insight.color + '30' }]}>
            <View style={[styles.insightIcon, { backgroundColor: insight.color + '20' }]}>
              <Icon size={18} stroke={insight.color} />
            </View>
            <Text style={[styles.insightText, { color: colors.text }]}>{insight.text}</Text>
          </View>
        );
      })}

      <View style={[styles.noteCard, { backgroundColor: colors.gold + '15' }]}>
        <Text style={[styles.noteText, { color: colors.gold }]}>
          {rtl.isRTL 
            ? '💡 يمكنك تصحيح أي استنتاج خاطئ عنك بالكتابة في المحادثة.'
            : '💡 You can correct any wrong assumption about you by writing in the chat.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.md },
  hero: { alignItems: 'center', paddingVertical: SPACE.md },
  heroIcon: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: SPACE.sm },
  heroTitle: { fontSize: 18, fontWeight: '700' },
  insightCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.md },
  insightIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  insightText: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 22 },
  noteCard: { borderRadius: RADIUS.sm, padding: SPACE.md },
  noteText: { fontSize: 12, textAlign: 'center' },
});
