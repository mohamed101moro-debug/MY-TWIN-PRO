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
  PenTool, Edit3, Search, TrendingUp, 
  MessageSquare, BookOpen, Camera, Calendar,
  Sparkles, ChevronRight, Brain, Clock, Filter
} from 'lucide-react-native';

interface CreatorSession {
  id: string;
  title: string;
  type: string;
  content: string;
  timestamp: string;
}

const CREATOR_CATEGORIES = [
  {
    id: 'writing', icon: PenTool, color: '#8B5CF6',
    label_ar: 'كتابة', label_en: 'Writing',
    actions: [
      { type: 'outline', label_ar: 'مخطط', label_en: 'Outline', icon: BookOpen },
      { type: 'write', label_ar: 'كتابة', label_en: 'Write', icon: PenTool },
    ]
  },
  {
    id: 'editing', icon: Edit3, color: '#3B82F6',
    label_ar: 'تحرير', label_en: 'Editing',
    actions: [
      { type: 'rewrite', label_ar: 'إعادة صياغة', label_en: 'Rewrite', icon: Edit3 },
      { type: 'compress', label_ar: 'اختصار', label_en: 'Compress', icon: Edit3 },
      { type: 'expand', label_ar: 'توسيع', label_en: 'Expand', icon: Edit3 },
      { type: 'grammar', label_ar: 'تدقيق لغوي', label_en: 'Grammar', icon: Edit3 },
      { type: 'tone_shift', label_ar: 'تغيير النبرة', label_en: 'Tone Shift', icon: Edit3 },
    ]
  },
  {
    id: 'seo', icon: Search, color: '#10B981',
    label_ar: 'SEO', label_en: 'SEO',
    actions: [
      { type: 'seo_optimize', label_ar: 'تحسين SEO', label_en: 'Optimize', icon: TrendingUp },
      { type: 'keywords', label_ar: 'كلمات مفتاحية', label_en: 'Keywords', icon: Search },
      { type: 'meta', label_ar: 'وصف ميتا', label_en: 'Meta Description', icon: Search },
    ]
  },
  {
    id: 'ads', icon: TrendingUp, color: '#F59E0B',
    label_ar: 'إعلانات', label_en: 'Ads',
    actions: [
      { type: 'ad_copy', label_ar: 'نص إعلاني', label_en: 'Ad Copy', icon: TrendingUp },
    ]
  },
  {
    id: 'story', icon: BookOpen, color: '#EC4899',
    label_ar: 'قصص', label_en: 'Story',
    actions: [
      { type: 'character', label_ar: 'بناء شخصية', label_en: 'Build Character', icon: BookOpen },
      { type: 'dialogue', label_ar: 'حوار', label_en: 'Dialogue', icon: MessageSquare },
    ]
  },
  {
    id: 'research', icon: Brain, color: '#6366F1',
    label_ar: 'بحث', label_en: 'Research',
    actions: [
      { type: 'research', label_ar: 'بحث', label_en: 'Research', icon: Brain },
      { type: 'fact_check', label_ar: 'تحقق', label_en: 'Fact Check', icon: Brain },
    ]
  },
];

const QUICK_ACTIONS = [
  { type: 'calendar', icon: Calendar, color: '#14B8A6', label_ar: 'تقويم محتوى', label_en: 'Calendar' },
  { type: 'critic', icon: Sparkles, color: '#F97316', label_ar: 'مراجعة ناقد', label_en: 'Critic Review' },
  { type: 'repurpose', icon: Filter, color: '#A855F7', label_ar: 'إعادة توظيف', label_en: 'Repurpose' },
];

export default function ContentCreatorCapability() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [active, setActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CreatorSession[]>([]);
  const [relevantMemories, setRelevantMemories] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [lastSession, setLastSession] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('writing');

  useEffect(() => {
    const unsub1 = EventBus.on('CAPABILITY_ACTIVATED', (payload: any) => {
      if (payload?.capability === 'content_creator') { setActive(true); loadCreatorContext(); }
    });
    const unsub2 = EventBus.on('CAPABILITY_DEACTIVATED', () => setActive(false));
    const unsub3 = EventBus.on('WORKSPACE_CHANGE_REQUESTED', (payload: any) => {
      if (payload?.workspace === 'content_creator') { setActive(true); loadCreatorContext(); }
      else if (payload?.workspace === null && active) { setActive(false); }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [active]);

  const loadCreatorContext = async () => {
    try {
      const saved = await unifiedBrainBridge.getCapabilityMemory('content', 5);
      if (saved.length > 0) {
        setSessions(saved.map((m: any) => ({ id: m.id, title: (m.expressed_text || m.content || '').substring(0, 60), type: 'writing', content: m.expressed_text || m.content, timestamp: m.created_at || m.timestamp })));
        setLastSession((saved[0].expressed_text || saved[0].content || '').substring(0, 60));
      }
    } catch (e) {}
  };

  const handleQuickAction = async (actionType: string) => {
    if (!inputText.trim() || isProcessing) return;
    setActiveAction(actionType);
    setIsProcessing(true);
    setLastResponse('');

    try {
      const enhancedMessage = `${rtl.isRTL ? 'طلب إبداعي:' : 'Creative request:'} ${actionType}: ${inputText.trim()}`;
      const result = await sendMessage(enhancedMessage, [], rtl.isRTL ? 'ar' : 'en');
      const reply = result?.reply || (rtl.isRTL ? 'تمت المعالجة.' : 'Processed.');

      const newSession: CreatorSession = { id: Date.now().toString(), title: inputText.trim().substring(0, 60), type: actionType, content: reply, timestamp: new Date().toISOString() };
      setSessions(prev => [newSession, ...prev.slice(0, 9)]);
      setLastResponse(reply);

      try {
        await unifiedBrainBridge.storeMemory('learning', inputText.trim(), 60, 'inspired', ['content', actionType]);
      } catch (e) {}

      economyEngine.addPoints('study_session', 10, 'جلسة Creative Studio');
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
        if (emotion === 'inspired' || emotion === 'creative') {
          EventBus.emit('TWIN_SPEAK', { phrase: rtl.isRTL ? 'هل تريد صناعة محتوى جديد؟' : 'Do you want to create new content?', tone: 'gentle' });
        }
      } catch (e) {}
    }, 8000);
    return () => clearTimeout(timer);
  }, [active]);

  const handleDeactivate = () => {
    EventBus.emit('CAPABILITY_DEACTIVATED', { capability: 'content_creator', timestamp: Date.now() });
    capabilityResolver.deactivate();
  };

  if (!active) return null;

  const activeCat = CREATOR_CATEGORIES.find(c => c.id === activeCategory) || CREATOR_CATEGORIES[0];

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrapLarge, { backgroundColor: '#8B5CF6' + '20' }]}>
            <PenTool size={24} stroke="#8B5CF6" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Creative Studio</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {rtl.isRTL ? 'الاستوديو الإبداعي' : 'Creative Studio'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDeactivate}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {lastSession && (
          <View style={[styles.lastSessionCard, { backgroundColor: '#8B5CF6' + '10' }]}>
            <Brain size={16} stroke="#8B5CF6" />
            <Text style={[styles.lastSessionText, { color: '#8B5CF6' }]}>{rtl.isRTL ? 'آخر جلسة:' : 'Last session:'} {lastSession}</Text>
          </View>
        )}

        <View style={[styles.canvasCard, { backgroundColor: colors.card, borderColor: '#8B5CF6' + '40' }]}>
          <View style={styles.canvasHeader}>
            <Sparkles size={16} stroke="#8B5CF6" />
            <Text style={[styles.canvasLabel, { color: '#8B5CF6' }]}>
              {rtl.isRTL ? 'ماذا تريد أن تصنع اليوم؟' : 'What do you want to create today?'}
            </Text>
          </View>
          <TextInput
            style={[styles.canvasInput, { textAlign: rtl.textAlign, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={rtl.isRTL ? 'اكتب فكرتك، مقالك، أو نصك...' : 'Write your idea, article, or text...'}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.categoriesRow}>
            {CREATOR_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, activeCategory === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Icon size={14} stroke={cat.color} />
                  <Text style={[styles.categoryLabel, { color: cat.color }]}>
                    {rtl.isRTL ? cat.label_ar : cat.label_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actionsGrid}>
            {activeCat.actions.map(action => {
              const ActionIcon = action.icon;
              const isActive = activeAction === action.type;
              return (
                <TouchableOpacity
                  key={action.type}
                  style={[styles.actionBtn, { borderColor: activeCat.color + '40' }, isActive && { backgroundColor: activeCat.color + '15' }]}
                  onPress={() => handleQuickAction(action.type)}
                  disabled={isProcessing}
                >
                  <ActionIcon size={16} stroke={activeCat.color} />
                  <Text style={[styles.actionLabel, { color: activeCat.color }]}>
                    {rtl.isRTL ? action.label_ar : action.label_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map(action => {
              const ActionIcon = action.icon;
              return (
                <TouchableOpacity
                  key={action.type}
                  style={[styles.quickActionBtn, { borderColor: action.color + '30' }]}
                  onPress={() => handleQuickAction(action.type)}
                  disabled={isProcessing}
                >
                  <ActionIcon size={15} stroke={action.color} />
                  <Text style={[styles.quickActionLabel, { color: action.color }]}>
                    {rtl.isRTL ? action.label_ar : action.label_en}
                  </Text>
                  <ChevronRight size={12} stroke={action.color} opacity={0.5} />
                </TouchableOpacity>
              );
            })}
          </View>

          {isProcessing && (
            <Text style={[styles.processingText, { color: '#8B5CF6' }]}>
              {rtl.isRTL ? 'جاري الإبداع...' : 'Creating...'}
            </Text>
          )}

          {lastResponse !== '' && (
            <View style={[styles.responseCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.responseText, { color: colors.text }]} numberOfLines={12}>{lastResponse}</Text>
            </View>
          )}
        </View>

        {sessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {rtl.isRTL ? 'جلسات إبداعية سابقة' : 'Previous Creative Sessions'}
            </Text>
            {sessions.slice(0, 5).map(session => (
              <View key={session.id} style={[styles.sessionItem, { backgroundColor: colors.card }]}>
                <View style={[styles.sessionIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                  <PenTool size={14} stroke="#8B5CF6" />
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
            ))}
          </View>
        )}

        {relevantMemories.length > 0 && (
          <View style={[styles.memoriesCard, { backgroundColor: '#8B5CF6' + '10', borderColor: '#8B5CF6' + '30' }]}>
            <View style={styles.memoriesHeader}>
              <Brain size={16} stroke="#8B5CF6" />
              <Text style={[styles.memoriesTitle, { color: '#8B5CF6' }]}>
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
  canvasInput: { borderRadius: RADIUS.sm, padding: 14, fontSize: 15, borderWidth: 1, minHeight: 100 },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.md, marginBottom: SPACE.sm },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'transparent' },
  categoryLabel: { fontSize: 12, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginBottom: SPACE.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1.5 },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  quickActionsRow: { gap: SPACE.sm, marginBottom: SPACE.sm },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, marginBottom: 6 },
  quickActionLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
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
