import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { EventBus } from '../core/EventBus';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { capabilityResolver } from '../coordinators/CapabilityResolver';
import { economyEngine } from '../services/EconomyEngine';
import { useRTL } from '../../lib/useRTL';
import { useAppTheme } from '../../engine/colors';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { BookOpen, Target, Brain, ChevronRight, Clock } from 'lucide-react-native';

interface StudyTopic {
  id: string;
  title: string;
  progress: number;
  lastStudied: string;
}

export default function StudyCapability() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [active, setActive] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');
  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [lastTopic, setLastTopic] = useState<string>('');

  useEffect(() => {
    const unsub1 = EventBus.on('CAPABILITY_ACTIVATED', (payload: any) => {
      if (payload?.capability === 'study') { setActive(true); loadStudyContext(); }
    });
    const unsub2 = EventBus.on('CAPABILITY_DEACTIVATED', () => setActive(false));
    const unsub3 = EventBus.on('WORKSPACE_CHANGE_REQUESTED', (payload: any) => {
      if (payload?.workspace === 'study') { setActive(true); loadStudyContext(); }
      else if (payload?.workspace === null && active) setActive(false);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [active]);

  const loadStudyContext = async () => {
    try {
      const saved = await unifiedBrainBridge.getCapabilityMemory('study', 5);
      if (saved.length > 0) {
        const mapped: StudyTopic[] = saved.map((m: any) => ({
          id: m.id,
          title: (m.expressed_text || m.content || '').substring(0, 80),
          progress: m.importance || 50,
          lastStudied: m.created_at || m.timestamp || new Date().toISOString(),
        }));
        setTopics(mapped);
        setLastTopic(mapped[0].title);
      }
    } catch (e) {}
  };

  const addTopic = async () => {
    if (!currentTopic.trim()) return;
    const newTopic: StudyTopic = { id: Date.now().toString(), title: currentTopic.trim(), progress: 0, lastStudied: new Date().toISOString() };
    setTopics(prev => [newTopic, ...prev]);
    try {
      await unifiedBrainBridge.storeMemory('learning', currentTopic.trim(), 60, 'focused', ['study']);
    } catch (e) {}
    setCurrentTopic('');
    economyEngine.rewardStudySession();
    EventBus.emit('STUDY_TOPIC_ADDED', { topic: newTopic });
  };

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(async () => {
      try {
        const twinState = await unifiedBrainBridge.getTwinState();
        const emotion = twinState?.twin_emotional_state?.current_emotion || 'neutral';
        if (emotion === 'focused' || emotion === 'curious') {
          EventBus.emit('TWIN_SPEAK', { phrase: rtl.isRTL ? 'هل نكمل ما بدأناه؟' : 'Shall we continue where we left off?', tone: 'gentle' });
        }
      } catch (e) {}
    }, 5000);
    return () => clearTimeout(timer);
  }, [active]);

  const handleDeactivate = () => {
    EventBus.emit('CAPABILITY_DEACTIVATED', { capability: 'study', timestamp: Date.now() });
    capabilityResolver.deactivate();
  };

  if (!active) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrapLarge, { backgroundColor: colors.accent + '20' }]}>
            <BookOpen size={24} stroke={colors.accent} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Study World</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'عالم الدراسة' : 'Study World'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDeactivate}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {lastTopic && (
        <View style={[styles.lastTopicCard, { backgroundColor: colors.accent + '10' }]}>
          <Brain size={16} stroke={colors.accent} />
          <Text style={[styles.lastTopicText, { color: colors.accent }]}>{rtl.isRTL ? 'آخر مرة:' : 'Last time:'} {lastTopic}</Text>
        </View>
      )}

      <View style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.accent + '30' }]}>
        <View style={styles.toolHeader}>
          <Target size={16} stroke={colors.accent} />
          <Text style={[styles.toolLabel, { color: colors.textSecondary }]}>{rtl.isRTL ? 'ماذا تريد أن تدرس؟' : 'What do you want to study?'}</Text>
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.addInput, { textAlign: rtl.textAlign, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={currentTopic}
            onChangeText={setCurrentTopic}
            placeholder={rtl.isRTL ? 'مثلاً: فيزياء الكم' : 'e.g., Quantum Physics'}
            placeholderTextColor={colors.textSecondary}
            onSubmitEditing={addTopic}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={addTopic}>
            <ChevronRight size={18} stroke="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {topics.length > 0 && (
        <View style={styles.topicsList}>
          {topics.map(topic => (
            <View key={topic.id} style={[styles.topicItem, { backgroundColor: colors.card }]}>
              <View style={styles.topicInfo}>
                <Clock size={14} stroke={colors.textSecondary} />
                <Text style={[styles.topicTitle, { color: colors.text }]}>{topic.title}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${topic.progress}%`, backgroundColor: colors.accent }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  iconWrapLarge: { width: 48, height: 48, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12 },
  closeBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.05)' },
  closeText: { fontSize: 16, fontWeight: '700' },
  lastTopicCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.md },
  lastTopicText: { fontSize: 13, flex: 1 },
  toolCard: { borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.md },
  toolHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm },
  toolLabel: { fontSize: 13, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: SPACE.sm },
  addInput: { flex: 1, borderRadius: RADIUS.sm, padding: 12, fontSize: 15, borderWidth: 1 },
  addBtn: { width: 44, height: 44, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  topicsList: { gap: SPACE.sm, marginTop: SPACE.md },
  topicItem: { borderRadius: RADIUS.sm, padding: SPACE.md },
  topicInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: 8 },
  topicTitle: { fontSize: 14, fontWeight: '500' },
  progressTrack: { height: 3, borderRadius: 2 },
  progressFill: { height: 3, borderRadius: 2 },
});
