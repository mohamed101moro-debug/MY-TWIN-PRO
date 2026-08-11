import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { EventBus } from '../core/EventBus';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { capabilityResolver } from '../coordinators/CapabilityResolver';
import { economyEngine } from '../services/EconomyEngine';
import { sendMessage } from '../services/twinApi';
import { useRTL } from '../../lib/useRTL';
import { useAppTheme } from '../../engine/colors';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { Code, Terminal, Bug, GitBranch, Rocket, ChevronRight, Brain, Clock } from 'lucide-react-native';

interface CodeSession {
  id: string;
  title: string;
  type: 'idea' | 'code_review' | 'project' | 'debug' | 'devops';
  content: string;
  timestamp: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Code; color: string; label_ar: string; label_en: string }> = {
  idea:       { icon: Rocket,    color: '#00BCD4', label_ar: 'فكرة',       label_en: 'Idea' },
  code_review:{ icon: Code,      color: '#3B82F6', label_ar: 'مراجعة كود', label_en: 'Code Review' },
  project:    { icon: GitBranch, color: '#10B981', label_ar: 'مشروع',      label_en: 'Project' },
  debug:      { icon: Bug,       color: '#F59E0B', label_ar: 'تصحيح',      label_en: 'Debug' },
  devops:     { icon: Terminal,  color: '#8B5CF6', label_ar: 'DevOps',     label_en: 'DevOps' },
};

const QUICK_ACTIONS: Array<{ type: CodeSession['type']; label_ar: string; label_en: string }> = [
  { type: 'idea',        label_ar: 'حلل فكرة',       label_en: 'Analyze Idea' },
  { type: 'code_review', label_ar: 'راجع كود',       label_en: 'Review Code' },
  { type: 'project',     label_ar: 'ابدأ مشروع',     label_en: 'Start Project' },
  { type: 'debug',       label_ar: 'صحح خطأ',        label_en: 'Debug' },
  { type: 'devops',      label_ar: 'توليد DevOps',   label_en: 'Generate DevOps' },
];

export default function DeveloperLabCapability() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [active, setActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeAction, setActiveAction] = useState<CodeSession['type'] | null>(null);
  const [sessions, setSessions] = useState<CodeSession[]>([]);
  const [relevantMemories, setRelevantMemories] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [lastSession, setLastSession] = useState<string>('');

  useEffect(() => {
    const unsub1 = EventBus.on('CAPABILITY_ACTIVATED', (payload: any) => {
      if (payload?.capability === 'code_lab') { setActive(true); loadCodeContext(); }
    });
    const unsub2 = EventBus.on('CAPABILITY_DEACTIVATED', () => setActive(false));
    const unsub3 = EventBus.on('WORKSPACE_CHANGE_REQUESTED', (payload: any) => {
      if (payload?.workspace === 'code_lab') { setActive(true); loadCodeContext(); }
      else if (payload?.workspace === null && active) { setActive(false); }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [active]);

  const loadCodeContext = async () => {
    try {
      const saved = await unifiedBrainBridge.getCapabilityMemory('code', 5);
      if (saved.length > 0) {
        setSessions(saved.map((m: any) => ({
          id: m.id,
          title: (m.expressed_text || m.content || '').substring(0, 60),
          type: (Object.keys(TYPE_CONFIG).find(k => (m.expressed_text || m.content || '').toLowerCase().includes(k)) || 'idea') as CodeSession['type'],
          content: m.expressed_text || m.content,
          timestamp: m.created_at || m.timestamp,
        })));
        setLastSession((saved[0].expressed_text || saved[0].content || '').substring(0, 60));
      }
    } catch (e) {}
  };

  const handleQuickAction = async (action: typeof QUICK_ACTIONS[0]) => {
    if (!inputText.trim() || isProcessing) return;
    setActiveAction(action.type);
    setIsProcessing(true);
    setLastResponse('');

    try {
      const enhancedMessage = `${rtl.isRTL ? 'طلب برمجي:' : 'Dev request:'} ${action.type}: ${inputText.trim()}`;
      const result = await sendMessage(enhancedMessage, [], rtl.isRTL ? 'ar' : 'en');
      const reply = result?.reply || (rtl.isRTL ? 'تمت المعالجة.' : 'Processed.');

      const newSession: CodeSession = { id: Date.now().toString(), title: inputText.trim().substring(0, 60), type: action.type, content: reply, timestamp: new Date().toISOString() };
      setSessions(prev => [newSession, ...prev.slice(0, 9)]);
      setLastResponse(reply);

      try {
        await unifiedBrainBridge.storeMemory('learning', inputText.trim(), 60, 'focused', ['code', action.type]);
      } catch (e) {}

      economyEngine.addPoints('study_session', 15, 'جلسة Developer Lab');
    } catch (e) {
      setLastResponse(rtl.isRTL ? 'حدث خطأ. حاول مرة أخرى.' : 'An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
      setInputText('');
    }
  };

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(async () => {
      try {
        const twinState = await unifiedBrainBridge.getTwinState();
        const emotion = twinState?.twin_emotional_state?.current_emotion || 'neutral';
        if (emotion === 'focused' || emotion === 'curious') {
          EventBus.emit('TWIN_SPEAK', { phrase: rtl.isRTL ? 'هل لديك كود تريد مراجعته؟' : 'Do you have code to review?', tone: 'gentle' });
        }
      } catch (e) {}
    }, 8000);
    return () => clearTimeout(timer);
  }, [active]);

  const handleDeactivate = () => {
    EventBus.emit('CAPABILITY_DEACTIVATED', { capability: 'code_lab', timestamp: Date.now() });
    capabilityResolver.deactivate();
  };

  if (!active) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrapLarge, { backgroundColor: '#00BCD4' + '20' }]}>
            <Terminal size={24} stroke="#00BCD4" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Developer Lab</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'معمل المطور' : 'Developer Lab'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDeactivate}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {lastSession && (
          <View style={[styles.lastSessionCard, { backgroundColor: '#00BCD4' + '10' }]}>
            <Brain size={16} stroke="#00BCD4" />
            <Text style={[styles.lastSessionText, { color: '#00BCD4' }]}>{rtl.isRTL ? 'آخر جلسة:' : 'Last session:'} {lastSession}</Text>
          </View>
        )}

        <View style={[styles.canvasCard, { backgroundColor: colors.card, borderColor: '#00BCD4' + '40' }]}>
          <View style={styles.canvasHeader}>
            <Code size={16} stroke="#00BCD4" />
            <Text style={[styles.canvasLabel, { color: '#00BCD4' }]}>{rtl.isRTL ? 'ماذا تريد أن تبني؟' : 'What do you want to build?'}</Text>
          </View>
          <TextInput
            style={[styles.canvasInput, { textAlign: rtl.textAlign, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={rtl.isRTL ? 'اكتب كودك، فكرتك، أو مشكلتك...' : 'Write your code, idea, or problem...'}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(action => {
              const config = TYPE_CONFIG[action.type];
              const Icon = config.icon;
              return (
                <TouchableOpacity
                  key={action.type}
                  style={[styles.actionBtn, { borderColor: config.color + '40' }, activeAction === action.type && { backgroundColor: config.color + '15' }]}
                  onPress={() => handleQuickAction(action)}
                  disabled={isProcessing}
                >
                  <Icon size={18} stroke={config.color} />
                  <Text style={[styles.actionLabel, { color: config.color }]}>
                    {rtl.isRTL ? action.label_ar : action.label_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isProcessing && (
            <Text style={[styles.processingText, { color: colors.gold }]}>{rtl.isRTL ? 'جاري المعالجة...' : 'Processing...'}</Text>
          )}

          {lastResponse !== '' && (
            <View style={[styles.responseCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.responseText, { color: colors.text }]} numberOfLines={8}>{lastResponse}</Text>
            </View>
          )}
        </View>

        {sessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'الجلسات السابقة' : 'Previous Sessions'}</Text>
            {sessions.map(session => {
              const config = TYPE_CONFIG[session.type] || TYPE_CONFIG.idea;
              const Icon = config.icon;
              return (
                <View key={session.id} style={[styles.sessionItem, { backgroundColor: colors.card }]}>
                  <View style={[styles.sessionIcon, { backgroundColor: config.color + '20' }]}>
                    <Icon size={14} stroke={config.color} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>{session.title}</Text>
                    <View style={styles.sessionMeta}>
                      <Clock size={10} stroke={colors.textSecondary} />
                      <Text style={[styles.sessionTime, { color: colors.textSecondary }]}>{new Date(session.timestamp).toLocaleDateString(rtl.isRTL ? 'ar' : 'en')}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {relevantMemories.length > 0 && (
          <View style={[styles.memoriesCard, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
            <View style={styles.memoriesHeader}>
              <Brain size={16} stroke={colors.accent} />
              <Text style={[styles.memoriesTitle, { color: colors.accent }]}>{rtl.isRTL ? 'تذكرت...' : 'I remember...'}</Text>
            </View>
            {relevantMemories.map(memory => (
              <Text key={memory.id} style={[styles.memoryText, { color: colors.textSecondary }]} numberOfLines={2}>{memory.content}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, maxHeight: '70%' },
  scroll: { gap: SPACE.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  iconWrapLarge: { width: 48, height: 48, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12 },
  closeBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.05)' },
  closeText: { fontSize: 16, fontWeight: '700' },
  lastSessionCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.md },
  lastSessionText: { fontSize: 13, flex: 1 },
  canvasCard: { borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.md },
  canvasHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm },
  canvasLabel: { fontSize: 14, fontWeight: '600' },
  canvasInput: { borderRadius: RADIUS.sm, padding: 14, fontSize: 15, borderWidth: 1, minHeight: 100 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1.5 },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  processingText: { fontSize: 13, marginTop: SPACE.sm, fontStyle: 'italic' },
  responseCard: { borderRadius: RADIUS.sm, padding: SPACE.md, marginTop: SPACE.md, borderWidth: 1 },
  responseText: { fontSize: 14, lineHeight: 22 },
  sessionsSection: { marginTop: SPACE.md },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: SPACE.sm },
  sessionItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: 6 },
  sessionIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 13, fontWeight: '500' },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sessionTime: { fontSize: 10 },
  memoriesCard: { borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.md, marginTop: SPACE.md },
  memoriesHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm },
  memoriesTitle: { fontSize: 13, fontWeight: '600' },
  memoryText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
});
