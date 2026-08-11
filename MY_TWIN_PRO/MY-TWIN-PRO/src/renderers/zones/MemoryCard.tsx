import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { MOTION } from '../../../src/design/tokens/motion';
import { Calendar, Heart, Sparkles, Clock, X } from 'lucide-react-native';

interface MemoryCardProps {
  id: string;
  content: string;
  type: 'conversation' | 'event' | 'emotion' | 'decision' | 'learning';
  timestamp: string;
  emotion: string;
  onDismiss?: (id: string) => void;
  onTap?: (id: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: typeof Calendar; color: string; label: string }> = {
  event: { icon: Calendar, color: '#F59E0B', label: 'ذكرى' },
  emotion: { icon: Heart, color: '#EC4899', label: 'شعور' },
  decision: { icon: Sparkles, color: '#A855F7', label: 'قرار' },
  learning: { icon: Sparkles, color: '#3B82F6', label: 'درس' },
  conversation: { icon: Clock, color: '#6B7280', label: 'حديث' },
};

export default function MemoryCard({ id, content, type, timestamp, emotion, onDismiss, onTap }: MemoryCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.95);

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.conversation;
  const Icon = config.icon;

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.1)) });
    scale.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }] as const,
  }));

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(-20, { duration: 200 });
    setTimeout(() => onDismiss?.(id), 200);
  };

  const date = new Date(timestamp);
  const timeAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onTap?.(id)}
        activeOpacity={0.9}
      >
        <View style={[styles.iconWrap, { backgroundColor: config.color + '20' }]}>
          <Icon size={20} stroke={config.color} />
        </View>

        <View style={styles.textWrap}>
          <View style={styles.headerRow}>
            <Text style={[styles.type, { color: config.color }]}>{config.label}</Text>
            <Text style={styles.time}>
              {timeAgo === 0 ? 'اليوم' : `قبل ${timeAgo} يوم`}
            </Text>
          </View>
          <Text style={styles.content} numberOfLines={3}>
            {content}
          </Text>
        </View>

        <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} stroke="#6B5B8A" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.xs,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 18, 38, 0.95)',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    padding: SPACE.md,
    gap: SPACE.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  time: {
    color: '#6B5B8A',
    fontSize: 11,
  },
  content: {
    color: '#E8E0F0',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
});
