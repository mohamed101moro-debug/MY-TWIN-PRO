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
import { Image as ImageIcon, Palette, Wand2, Search, Camera, Clock, Sparkles, ChevronRight, Brain } from 'lucide-react-native';

interface ImageSession {
  id: string;
  title: string;
  type: string;
  content: string;
  timestamp: string;
}

const IMAGE_ACTIONS = [
  { type: 'generate', icon: Wand2, color: '#EC4899', label_ar: 'توليد صورة', label_en: 'Generate Image' },
  { type: 'enhance_prompt', icon: Palette, color: '#A855F7', label_ar: 'تحسين الوصف', label_en: 'Enhance Prompt' },
  { type: 'analyze', icon: Search, color: '#3B82F6', label_ar: 'تحليل صورة', label_en: 'Analyze Image' },
  { type: 'edit', icon: Camera, color: '#F59E0B', label_ar: 'تعديل صورة', label_en: 'Edit Image' },
];

export default function AIImageCapability() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [active, setActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ImageSession[]>([]);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState('');

  useEffect(() => {
    const unsub1 = EventBus.on('CAPABILITY_ACTIVATED', (payload: any) => { if (payload?.capability === 'ai_image') { setActive(true); loadImageContext(); } });
    const unsub2 = EventBus.on('CAPABILITY_DEACTIVATED', () => setActive(false));
    const unsub3 = EventBus.on('WORKSPACE_CHANGE_REQUESTED', (payload: any) => { if (payload?.workspace === 'ai_image') { setActive(true); loadImageContext(); } else if (payload?.workspace === null && active) setActive(false); });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [active]);

  const loadImageContext = async () => {
    try {
      const saved = await unifiedBrainBridge.getCapabilityMemory('ai_image', 5);
      if (saved.length > 0) {
        setSessions(saved.map((m: any) => ({ id: m.id, title: (m.expressed_text || m.content || '').substring(0, 60), type: m.relatedTo?.[0] || 'generate', content: m.expressed_text || m.content, timestamp: m.created_at || m.timestamp })));
        setLastPrompt((saved[0].expressed_text || saved[0].content || '').substring(0, 80));
      }
    } catch (e) {}
  };

  const handleQuickAction = async (actionType: string) => {
    if (!inputText.trim() || isProcessing) return;
    setActiveAction(actionType);
    setIsProcessing(true);
    setLastResponse('');

    try {
      const enhancedMessage = `${rtl.isRTL ? 'طلب صورة:' : 'Image request:'} ${actionType}: ${inputText.trim()}`;
      const result = await sendMessage(enhancedMessage, [], rtl.isRTL ? 'ar' : 'en');
      const reply = result?.reply || (rtl.isRTL ? 'تمت المعالجة.' : 'Processed.');

      const newSession: ImageSession = { id: Date.now().toString(), title: inputText.trim().substring(0, 60), type: actionType, content: reply, timestamp: new Date().toISOString() };
      setSessions(prev => [newSession, ...prev.slice(0, 9)]);
      setLastResponse(reply);

      try {
        await unifiedBrainBridge.storeMemory('learning', inputText.trim(), 60, 'inspired', ['ai_image', actionType]);
      } catch (e) {}

      economyEngine.addPoints('study_session', 10, 'جلسة AI Image Lab');
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
          EventBus.emit('TWIN_SPEAK', { phrase: rtl.isRTL ? 'هل تريد إنشاء صورة جديدة؟' : 'Do you want to create a new image?', tone: 'gentle' });
        }
      } catch (e) {}
    }, 8000);
    return () => clearTimeout(timer);
  }, [active]);

  const handleDeactivate = () => {
    EventBus.emit('CAPABILITY_DEACTIVATED', { capability: 'ai_image', timestamp: Date.now() });
    capabilityResolver.deactivate();
  };

  if (!active) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrapLarge, { backgroundColor: colors.rose + '20' }]}>
            <ImageIcon size={24} stroke={colors.rose} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Image Lab</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'معمل الصور' : 'Image Lab'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDeactivate}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {lastPrompt && (
          <View style={[styles.lastPromptCard, { backgroundColor: colors.rose + '10' }]}>
            <Brain size={16} stroke={colors.rose} />
            <Text style={[styles.lastPromptText, { color: colors.rose }]}>{rtl.isRTL ? 'آخر وصف:' : 'Last prompt:'} {lastPrompt}</Text>
          </View>
        )}

        <View style={[styles.canvasCard, { backgroundColor: colors.card, borderColor: colors.rose + '40' }]}>
          <View style={styles.canvasHeader}>
            <Wand2 size={16} stroke={colors.rose} />
            <Text style={[styles.canvasLabel, { color: colors.rose }]}>{rtl.isRTL ? 'ماذا تريد أن تصنع؟' : 'What do you want to create?'}</Text>
          </View>
          <TextInput
            style={[styles.canvasInput, { textAlign: rtl.textAlign, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={rtl.isRTL ? 'صف الصورة التي تتخيلها...' : 'Describe the image you imagine...'}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.actionsGrid}>
            {IMAGE_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={action.type}
                  style={[styles.actionBtn, { borderColor: action.color + '40' }, activeAction === action.type && { backgroundColor: action.color + '15' }]}
                  onPress={() => handleQuickAction(action.type)}
                  disabled={isProcessing}
                >
                  <Icon size={16} stroke={action.color} />
                  <Text style={[styles.actionLabel, { color: action.color }]}>{rtl.isRTL ? action.label_ar : action.label_en}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isProcessing && <Text style={[styles.processingText, { color: colors.rose }]}>{rtl.isRTL ? 'جاري التوليد...' : 'Generating...'}</Text>}

          {lastResponse !== '' && (
            <View style={[styles.responseCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.responseText, { color: colors.text }]} numberOfLines={10}>{lastResponse}</Text>
            </View>
          )}
        </View>

        {sessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'جلسات سابقة' : 'Previous Sessions'}</Text>
            {sessions.slice(0, 5).map(session => (
              <View key={session.id} style={[styles.sessionItem, { backgroundColor: colors.card }]}>
                <View style={[styles.sessionIcon, { backgroundColor: colors.rose + '20' }]}>
                  <ImageIcon size={14} stroke={colors.rose} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>{session.title}</Text>
                  <Text style={[styles.sessionTime, { color: colors.textSecondary }]}>{new Date(session.timestamp).toLocaleDateString(rtl.isRTL ? 'ar' : 'en')}</Text>
                </View>
              </View>
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
  lastPromptCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.md },
  lastPromptText: { fontSize: 13, flex: 1 },
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
  sessionTime: { fontSize: 10 },
});
