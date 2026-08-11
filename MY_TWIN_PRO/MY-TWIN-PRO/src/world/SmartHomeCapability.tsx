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
import { Home, Lightbulb, Thermometer, Music, Wifi, Power, Sparkles, Brain, Clock } from 'lucide-react-native';

interface SmartHomeSession {
  id: string;
  title: string;
  type: string;
  content: string;
  timestamp: string;
}

const HOME_ACTIONS = [
  { type: 'command', icon: Power, color: '#10B981', label_ar: 'أمر', label_en: 'Command' },
  { type: 'status', icon: Home, color: '#3B82F6', label_ar: 'الحالة', label_en: 'Status' },
  { type: 'environment', icon: Thermometer, color: '#F59E0B', label_ar: 'البيئة', label_en: 'Environment' },
  { type: 'automation', icon: Sparkles, color: '#A855F7', label_ar: 'أتمتة', label_en: 'Automation' },
  { type: 'predictions', icon: Brain, color: '#EC4899', label_ar: 'توقعات', label_en: 'Predictions' },
];

export default function SmartHomeCapability() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [active, setActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SmartHomeSession[]>([]);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState('');

  useEffect(() => {
    const unsub1 = EventBus.on('CAPABILITY_ACTIVATED', (payload: any) => { if (payload?.capability === 'smart_home') { setActive(true); loadHomeContext(); } });
    const unsub2 = EventBus.on('CAPABILITY_DEACTIVATED', () => setActive(false));
    const unsub3 = EventBus.on('WORKSPACE_CHANGE_REQUESTED', (payload: any) => { if (payload?.workspace === 'smart_home') { setActive(true); loadHomeContext(); } else if (payload?.workspace === null && active) setActive(false); });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [active]);

  const loadHomeContext = async () => {
    try {
      const saved = await unifiedBrainBridge.getCapabilityMemory('smart_home', 5);
      if (saved.length > 0) {
        setSessions(saved.map((m: any) => ({ id: m.id, title: (m.expressed_text || m.content || '').substring(0, 60), type: m.relatedTo?.[0] || 'command', content: m.expressed_text || m.content, timestamp: m.created_at || m.timestamp })));
        setLastCommand((saved[0].expressed_text || saved[0].content || '').substring(0, 80));
      }
    } catch (e) {}
  };

  const handleQuickAction = async (actionType: string) => {
    if (!inputText.trim() || isProcessing) return;
    setActiveAction(actionType);
    setIsProcessing(true);
    setLastResponse('');

    try {
      const enhancedMessage = `${rtl.isRTL ? 'طلب منزل ذكي:' : 'Smart home request:'} ${actionType}: ${inputText.trim()}`;
      const result = await sendMessage(enhancedMessage, [], rtl.isRTL ? 'ar' : 'en');
      const reply = result?.reply || (rtl.isRTL ? 'تم التنفيذ.' : 'Executed.');

      const newSession: SmartHomeSession = { id: Date.now().toString(), title: inputText.trim().substring(0, 60), type: actionType, content: reply, timestamp: new Date().toISOString() };
      setSessions(prev => [newSession, ...prev.slice(0, 9)]);
      setLastResponse(reply);

      try {
        await unifiedBrainBridge.storeMemory('decision', inputText.trim(), 50, 'neutral', ['smart_home', actionType]);
      } catch (e) {}

      economyEngine.addPoints('study_session', 5, 'أمر منزل ذكي');
    } catch (e) {
      setLastResponse(rtl.isRTL ? 'حدث خطأ.' : 'An error occurred.');
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
        if (emotion === 'neutral' || emotion === 'focused') {
          EventBus.emit('TWIN_SPEAK', { phrase: rtl.isRTL ? 'هل تحتاج شيئاً في المنزل؟' : 'Do you need anything at home?', tone: 'gentle' });
        }
      } catch (e) {}
    }, 8000);
    return () => clearTimeout(timer);
  }, [active]);

  const handleDeactivate = () => {
    EventBus.emit('CAPABILITY_DEACTIVATED', { capability: 'smart_home', timestamp: Date.now() });
    capabilityResolver.deactivate();
  };

  if (!active) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrapLarge, { backgroundColor: colors.success + '20' }]}>
            <Home size={24} stroke={colors.success} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Smart Home</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'المنزل الذكي' : 'Smart Home'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDeactivate}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {lastCommand && (
          <View style={[styles.lastCommandCard, { backgroundColor: colors.success + '10' }]}>
            <Brain size={16} stroke={colors.success} />
            <Text style={[styles.lastCommandText, { color: colors.success }]}>{rtl.isRTL ? 'آخر أمر:' : 'Last command:'} {lastCommand}</Text>
          </View>
        )}

        <View style={[styles.canvasCard, { backgroundColor: colors.card, borderColor: colors.success + '40' }]}>
          <View style={styles.canvasHeader}>
            <Power size={16} stroke={colors.success} />
            <Text style={[styles.canvasLabel, { color: colors.success }]}>{rtl.isRTL ? 'ماذا تريد أن تفعل في منزلك؟' : 'What do you want to do at home?'}</Text>
          </View>
          <TextInput
            style={[styles.canvasInput, { textAlign: rtl.textAlign, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={rtl.isRTL ? 'مثلاً: شغل الإضاءة، اضبط الحرارة...' : 'e.g., Turn on lights, adjust temperature...'}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.actionsGrid}>
            {HOME_ACTIONS.map(action => {
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

          {isProcessing && <Text style={[styles.processingText, { color: colors.success }]}>{rtl.isRTL ? 'جاري التنفيذ...' : 'Executing...'}</Text>}

          {lastResponse !== '' && (
            <View style={[styles.responseCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.responseText, { color: colors.text }]} numberOfLines={10}>{lastResponse}</Text>
            </View>
          )}
        </View>

        {sessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'أوامر سابقة' : 'Previous Commands'}</Text>
            {sessions.slice(0, 5).map(session => (
              <View key={session.id} style={[styles.sessionItem, { backgroundColor: colors.card }]}>
                <View style={[styles.sessionIcon, { backgroundColor: colors.success + '20' }]}>
                  <Home size={14} stroke={colors.success} />
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
  lastCommandCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.md },
  lastCommandText: { fontSize: 13, flex: 1 },
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
  sessionTime: { fontSize: 10 },
});
