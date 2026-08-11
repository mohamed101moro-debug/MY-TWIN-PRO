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
import { 
  Briefcase, Target, TrendingUp, FileText, 
  BarChart3, DollarSign, Rocket, Shield, 
  ChevronRight, Brain, Clock, Lightbulb 
} from 'lucide-react-native';

interface BusinessSession {
  id: string;
  title: string;
  type: string;
  content: string;
  timestamp: string;
}

interface BusinessMemory {
  id: string;
  content: string;
  importance: number;
}

const QUICK_ACTIONS = [
  { 
    type: 'generate_ideas',    icon: Lightbulb,  color: '#F59E0B',
    label_ar: 'توليد أفكار',     label_en: 'Generate Ideas',
  },
  { 
    type: 'analyze_market',    icon: BarChart3,   color: '#3B82F6',
    label_ar: 'تحليل السوق',     label_en: 'Market Analysis',
  },
  { 
    type: 'feasibility',       icon: Shield,      color: '#10B981',
    label_ar: 'دراسة جدوى',      label_en: 'Feasibility Study',
  },
  { 
    type: 'canvas',            icon: FileText,    color: '#8B5CF6',
    label_ar: 'Business Canvas', label_en: 'Business Canvas',
  },
  { 
    type: 'marketing_plan',    icon: TrendingUp,  color: '#EC4899',
    label_ar: 'خطة تسويق',       label_en: 'Marketing Plan',
  },
  { 
    type: 'pricing',           icon: DollarSign,  color: '#F97316',
    label_ar: 'استراتيجية تسعير', label_en: 'Pricing Strategy',
  },
  { 
    type: 'growth_plan',       icon: Rocket,      color: '#6366F1',
    label_ar: 'خطة نمو',         label_en: 'Growth Plan',
  },
  { 
    type: 'build_brand',       icon: Target,      color: '#14B8A6',
    label_ar: 'بناء علامة تجارية', label_en: 'Build Brand',
  },
  { 
    type: 'assess_risks',      icon: Shield,      color: '#EF4444',
    label_ar: 'تقييم المخاطر',    label_en: 'Risk Assessment',
  },
  { 
    type: 'full_plan',         icon: Briefcase,   color: '#F59E0B',
    label_ar: 'خطة عمل كاملة',    label_en: 'Full Business Plan',
  },
];

export default function BusinessCapability() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [active, setActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [sessions, setSessions] = useState<BusinessSession[]>([]);
  const [relevantMemories, setRelevantMemories] = useState<BusinessMemory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [lastSession, setLastSession] = useState<string>('');

  useEffect(() => {
    const unsub1 = EventBus.on('CAPABILITY_ACTIVATED', (payload: any) => {
      if (payload?.capability === 'business') {
        setActive(true);
        loadBusinessContext();
      }
    });
    const unsub2 = EventBus.on('CAPABILITY_DEACTIVATED', () => setActive(false));
    const unsub3 = EventBus.on('WORKSPACE_CHANGE_REQUESTED', (payload: any) => {
      if (payload?.workspace === 'business') { 
        setActive(true); 
        loadBusinessContext(); 
      } else if (payload?.workspace === null && active) { 
        setActive(false); 
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [active]);

  const loadBusinessContext = async () => {
    try {
      const saved = await unifiedBrainBridge.getCapabilityMemory('business', 5);
      if (saved.length > 0) {
        setSessions(saved.map((m: any) => ({
          id: m.id,
          title: (m.expressed_text || m.content || '').substring(0, 60),
          type: (m.relatedTo?.find((r: string) => ['business', 'startup', 'project', 'idea'].includes(r)) || 'idea'),
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
      const enhancedMessage = `${rtl.isRTL ? 'استفسار أعمال:' : 'Business inquiry:'} ${action.type}: ${inputText.trim()}`;
      const result = await sendMessage(enhancedMessage, [], rtl.isRTL ? 'ar' : 'en');
      const reply = result?.reply || (rtl.isRTL ? 'تمت المعالجة.' : 'Processed.');

      const newSession: BusinessSession = { id: Date.now().toString(), title: inputText.trim().substring(0, 60), type: action.type, content: reply, timestamp: new Date().toISOString() };
      setSessions(prev => [newSession, ...prev.slice(0, 9)]);
      setLastResponse(reply);

      try {
        await unifiedBrainBridge.storeMemory('learning', inputText.trim(), 60, 'focused', ['business', action.type]);
      } catch (e) {}

      economyEngine.addPoints('study_session', 15, 'جلسة Business World');
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
        if (emotion === 'focused' || emotion === 'inspired') {
          EventBus.emit('TWIN_SPEAK', { phrase: rtl.isRTL ? 'هل لديك فكرة مشروع جديدة؟' : 'Do you have a new project idea?', tone: 'gentle' });
        }
      } catch (e) {}
    }, 8000);
    return () => clearTimeout(timer);
  }, [active]);

  const handleDeactivate = () => {
    EventBus.emit('CAPABILITY_DEACTIVATED', { capability: 'business', timestamp: Date.now() });
    capabilityResolver.deactivate();
  };

  if (!active) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrapLarge, { backgroundColor: colors.gold + '20' }]}>
            <Briefcase size={24} stroke={colors.gold} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Business World</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {rtl.isRTL ? 'عالم الأعمال' : 'Business World'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDeactivate}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {lastSession && (
          <View style={[styles.lastSessionCard, { backgroundColor: colors.gold + '10' }]}>
            <Brain size={16} stroke={colors.gold} />
            <Text style={[styles.lastSessionText, { color: colors.gold }]}>{rtl.isRTL ? 'آخر جلسة:' : 'Last session:'} {lastSession}</Text>
          </View>
        )}

        <View style={[styles.canvasCard, { backgroundColor: colors.card, borderColor: colors.gold + '40' }]}>
          <View style={styles.canvasHeader}>
            <Lightbulb size={16} stroke={colors.gold} />
            <Text style={[styles.canvasLabel, { color: colors.gold }]}>
              {rtl.isRTL ? 'ما الذي تريد بناءه اليوم؟' : 'What do you want to build today?'}
            </Text>
          </View>
          <TextInput
            style={[styles.canvasInput, { textAlign: rtl.textAlign, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={rtl.isRTL ? 'صف فكرتك، مشروعك، أو استفسارك...' : 'Describe your idea, project, or inquiry...'}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(action => {
              const IconComponent = action.icon;
              const isActive = activeAction === action.type;
              return (
                <TouchableOpacity
                  key={action.type}
                  style={[
                    styles.actionBtn, 
                    { borderColor: action.color + '40' },
                    isActive && { backgroundColor: action.color + '15' }
                  ]}
                  onPress={() => handleQuickAction(action)}
                  disabled={isProcessing}
                >
                  <IconComponent size={16} stroke={action.color} />
                  <Text style={[styles.actionLabel, { color: action.color }]}>
                    {rtl.isRTL ? action.label_ar : action.label_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isProcessing && (
            <Text style={[styles.processingText, { color: colors.gold }]}>
              {rtl.isRTL ? 'جاري التحليل...' : 'Analyzing...'}
            </Text>
          )}

          {lastResponse !== '' && (
            <View style={[styles.responseCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.responseText, { color: colors.text }]} numberOfLines={10}>{lastResponse}</Text>
            </View>
          )}
        </View>

        {sessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {rtl.isRTL ? 'جلسات الأعمال السابقة' : 'Previous Business Sessions'}
            </Text>
            {sessions.slice(0, 5).map(session => {
              const actionConfig = QUICK_ACTIONS.find(a => a.type === session.type) || QUICK_ACTIONS[0];
              const IconComponent = actionConfig.icon;
              return (
                <View key={session.id} style={[styles.sessionItem, { backgroundColor: colors.card }]}>
                  <View style={[styles.sessionIcon, { backgroundColor: actionConfig.color + '20' }]}>
                    <IconComponent size={14} stroke={actionConfig.color} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>{session.title}</Text>
                    <View style={styles.sessionMeta}>
                      <Clock size={10} stroke={colors.textSecondary} />
                      <Text style={[styles.sessionTime, { color: colors.textSecondary }]}>
                        {new Date(session.timestamp).toLocaleDateString(rtl.isRTL ? 'ar' : 'en')}
                      </Text>
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
              <Text style={[styles.memoriesTitle, { color: colors.accent }]}>
                {rtl.isRTL ? 'تذكرت...' : 'I remember...'}
              </Text>
            </View>
            {relevantMemories.map(memory => (
              <Text key={memory.id} style={[styles.memoryText, { color: colors.textSecondary }]} numberOfLines={2}>
                {memory.content}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, maxHeight: '75%' },
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
  canvasInput: { borderRadius: RADIUS.sm, padding: 14, fontSize: 15, borderWidth: 1, minHeight: 80 },
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
