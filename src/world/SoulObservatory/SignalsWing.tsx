import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { unifiedBrainBridge } from '../../core/UnifiedBrainBridge';
import { stateBus } from '../../core/StateBus';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Bell, Heart, Calendar, Moon, Brain, Sparkles } from 'lucide-react-native';

interface Signal {
  id: string;
  type: 'memory' | 'reminder' | 'dream' | 'insight' | 'reflection';
  text: string;
  time: string;
  icon: typeof Bell;
  color: string;
}

export default function SignalsWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSignals();
  }, []);

  const generateSignals = async () => {
    const items: Signal[] = [];
    
    try {
      // 1. ذكريات اليوم من TCMA الحقيقية
      const todayMemories = await unifiedBrainBridge.getOnThisDay(2);
      if (todayMemories.length > 0) {
        const memory = todayMemories[0];
        items.push({
          id: 'memory',
          type: 'memory',
          text: rtl.isRTL 
            ? `في مثل هذا اليوم: ${(memory.expressed_text || memory.content || '').substring(0, 50)}...`
            : `On this day: ${(memory.expressed_text || memory.content || '').substring(0, 50)}...`,
          time: '',
          icon: Calendar,
          color: colors.accent,
        });
      }
    } catch (e) {}

    // 2. حالة الرابطة من StateBus
    const bond = stateBus.getState().relationship.bondLevel;
    if (bond > 60) {
      items.push({
        id: 'relationship',
        type: 'insight',
        text: rtl.isRTL 
          ? 'علاقتنا أصبحت أعمق هذا الأسبوع.'
          : 'Our bond has grown deeper this week.',
        time: '',
        icon: Heart,
        color: colors.rose,
      });
    }

    // 3. التأمل اليومي (دائماً موجود)
    items.push({
      id: 'reflection',
      type: 'reflection',
      text: rtl.isRTL 
        ? 'تأمل يومي: كيف كان يومك؟'
        : 'Daily reflection: How was your day?',
      time: '',
      icon: Brain,
      color: colors.success,
    });

    setSignals(items);
    setLoading(false);
  };

  if (signals.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {rtl.isRTL ? 'لا توجد إشارات الآن.' : 'No signals right now.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {rtl.isRTL ? 'الإشارات' : 'Signals'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {rtl.isRTL ? 'ما يريد التوأم أن يخبرك به.' : 'What your Twin wants to tell you.'}
      </Text>
      {signals.map(signal => {
        const Icon = signal.icon;
        return (
          <View key={signal.id} style={[styles.signalCard, { backgroundColor: colors.card, borderColor: signal.color + '30' }]}>
            <View style={[styles.signalIcon, { backgroundColor: signal.color + '20' }]}>
              <Icon size={20} stroke={signal.color} />
            </View>
            <Text style={[styles.signalText, { color: colors.text }]}>{signal.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.md },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginBottom: SPACE.sm },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: SPACE.xl },
  signalCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.md },
  signalIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  signalText: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 22 },
});
