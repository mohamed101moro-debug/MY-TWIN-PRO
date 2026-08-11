import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { livingSession } from '../core/LivingSession';
import { EventBus } from '../core/EventBus';
import { useRTL } from '../../lib/useRTL';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { Clock, MapPin, Activity, Zap, Heart } from 'lucide-react-native';

interface SessionDisplay {
  id: string;
  identity: string;
  weather: string;
  goal: string;
  startedAt: number;
  worldsVisited: string[];
  sacredCount: number;
}

const IDENTITY_LABELS: Record<string, { ar: string; en: string; icon: typeof Clock }> = {
  study: { ar: 'جلسة دراسة', en: 'Study Session', icon: Activity },
  creative: { ar: 'جلسة إبداعية', en: 'Creative Session', icon: Zap },
  business: { ar: 'جلسة أعمال', en: 'Business Session', icon: Activity },
  reflection: { ar: 'جلسة تأمل', en: 'Reflection Session', icon: Heart },
  general: { ar: 'جلسة', en: 'Session', icon: Clock },
};

export default function SessionSurface() {
  const rtl = useRTL();
  const [display, setDisplay] = useState<SessionDisplay | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsub1 = EventBus.on('SESSION_STARTED', (payload: any) => {
      setDisplay({
        id: payload?.sessionId || '',
        identity: payload?.identity || 'general',
        weather: payload?.weather || 'calm',
        goal: payload?.goal || 'general',
        startedAt: Date.now(),
        worldsVisited: [],
        sacredCount: 0,
      });
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    });

    const unsub2 = EventBus.on('SESSION_ENDED', (payload: any) => {
      if (display) {
        setDisplay({
          ...display,
          worldsVisited: payload?.worldsVisited || [],
          sacredCount: payload?.sacredMoments || 0,
        });
        setVisible(true);
        setTimeout(() => setVisible(false), 6000);
      }
    });

    return () => { unsub1(); unsub2(); };
  }, [display]);

  if (!visible || !display) return null;

  const identityConfig = IDENTITY_LABELS[display.identity] || IDENTITY_LABELS.general;
  const Icon = identityConfig.icon;
  const label = rtl.isRTL ? identityConfig.ar : identityConfig.en;
  const duration = Math.floor((Date.now() - display.startedAt) / 60000);

  return (
    <Animated.View entering={SlideInDown.duration(400)} exiting={SlideOutUp.duration(300)} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: '#A855F720' }]}>
            <Icon size={20} stroke="#A855F7" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.subtitle}>
              {duration > 0
                ? `${duration} ${rtl.isRTL ? 'دقيقة' : 'min'}`
                : rtl.isRTL ? 'بدأت الآن' : 'Just started'}
            </Text>
          </View>
        </View>
        {display.worldsVisited.length > 0 && (
          <View style={styles.worldsRow}>
            <MapPin size={12} stroke="#6B5B8A" />
            <Text style={styles.worldsText}>
              {display.worldsVisited.filter(w => w !== 'living_world').join(' → ')}
            </Text>
          </View>
        )}
        {display.sacredCount > 0 && (
          <View style={styles.sacredRow}>
            <Heart size={12} stroke="#EC4899" />
            <Text style={styles.sacredText}>
              {display.sacredCount} {rtl.isRTL ? 'لحظات مهمة' : 'sacred moments'}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 80, left: SPACE.lg, right: SPACE.lg, zIndex: 100 },
  card: { backgroundColor: 'rgba(26,18,38,0.95)', borderRadius: RADIUS.card, borderWidth: 1, borderColor: '#A855F740', padding: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  iconWrap: { width: 40, height: 40, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  textWrap: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  subtitle: { color: '#A78BFA', fontSize: 12, marginTop: 2 },
  worldsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACE.sm },
  worldsText: { color: '#6B5B8A', fontSize: 11 },
  sacredRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  sacredText: { color: '#EC4899', fontSize: 11 },
});
