import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, ScrollView, Dimensions, useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { API_BASE_URL, apiPost, apiGet } from '../lib/httpClient';
import { useTwinBrain } from '../src/hooks/useTwinBrain';
import { track } from '../lib/analytics';
import { useRTL } from '../lib/useRTL';
import { useAppTheme, ThemeColors } from '../engine/colors';
import { useTwinStore } from '../store/useTwinStore';
import { stateBus } from '../src/core/StateBus';
import { presenceBridge } from '../src/core/PresenceBridge';
import { EventBus } from '../src/core/EventBus';
import { devicePresenceEngine } from '../engine/device/DevicePresenceEngine';
import ConsciousBeing from '../src/components/conscious/ConsciousBeing';
import SoulObservatory from '../src/world/SoulObservatory/SoulObservatory';
import { Send, Mic, Database, Eye, Heart, Sparkles, Target, Moon, X, Camera } from 'lucide-react-native';

let _voiceEngine: any = null;
const getVoice = () => { if (!_voiceEngine) { try { _voiceEngine = require('../engine/voice/VoiceEngine').voiceEngine; } catch {} } return _voiceEngine; };
const { height } = Dimensions.get('window');
const withTimeout = <T,>(pr: Promise<T>, ms = 20000): Promise<T> => Promise.race([pr, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.5));

const WINGS = [
  { key: 'memory', label: 'الذاكرة', Icon: Database },
  { key: 'perception', label: 'الإدراك', Icon: Eye },
  { key: 'emotion', label: 'المشاعر', Icon: Heart },
  { key: 'intuition', label: 'الحدس', Icon: Sparkles },
  { key: 'goals', label: 'الأهداف', Icon: Target },
  { key: 'dreams', label: 'الأحلام', Icon: Moon },
];

const emotionHaptic = async (em: string) => {
  try {
    if (em.includes('happ') || em.includes('excit') || em.includes('surpr'))
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (em.includes('ang')) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} }, 120);
    } else if (em.includes('sad') || em.includes('fear'))
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (em.includes('think') || em.includes('focus'))
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    else await Haptics.selectionAsync();
  } catch {}
};


export default function LivingWorld() {
  const userId = useTwinStore(s => s.userId) || '';
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const { colors: themeColors } = useAppTheme();
  const colors = isDark ? ThemeColors.dark : themeColors;
  const rtl = useRTL();
  const lang = rtl.isRTL ? 'ar' : 'en';

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; sender: 'user' | 'twin'; text: string }>>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [wing, setWing] = useState<string | null>(null);
  const [activeWing, setActiveWing] = useState<string | null>(null);
  const [wingData, setWingData] = useState<Array<{ k: string; v: string }>>([]);
  const [online, setOnline] = useState(true);
  const [diag, setDiag] = useState('');
  const [tele, setTele] = useState<{ n: number; hb: number | null } | null>(null);
  const [gating, setGating] = useState<any>(null);

  const wingT = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const brain = useTwinBrain(userId, lang);
  const lastEmotion = useRef<string>('calm');

  const light = useCallback((w: string, ms = 2600) => {
    setWing(w);
    if (wingT.current) clearTimeout(wingT.current);
    wingT.current = setTimeout(() => setWing(null), ms);
  }, []);

  useEffect(() => {
    if (!userId) return;
    try { const { bootstrapCoordinator } = require('../src/core/BootstrapCoordinator'); bootstrapCoordinator.refreshUser(userId).catch(() => {}); } catch {}
    try { require('../lib/analytics').initAnalytics(); } catch {}
    try { getVoice()?.start?.(); } catch {}
    light('perception', 3000);
    (async () => { try { const d: any = await apiGet('/api/self/absence_summary'); if (d?.summary) setMessages(prev => (prev.length ? prev : [{ id: 'absence', sender: 'twin', text: d.summary }])); } catch {} })();
    (async () => { try { const last = await AsyncStorage.getItem('ritual_day'); const today = new Date().toDateString(); if (last !== today) { const r: any = await apiGet('/api/ritual/next'); if (r?.text) { setMessages(prev => [...prev, { id: 'ritual', sender: 'twin', text: r.text }]); await AsyncStorage.setItem('ritual_day', today); } } } catch {} })();
    const u1 = EventBus.on('MEMORY_SURFACED', () => light('memory'));
    const u2 = EventBus.on('MILESTONE_REACHED', () => light('goals'));
    return () => {
      try { getVoice()?.stop?.(); } catch {}
      try { u1?.(); u2?.(); } catch {}
    };
  }, [userId]);

  useEffect(() => { (async () => { try { const o: any = await apiGet('/api/economy/overview'); setGating(o?.gating || null); } catch {} })(); }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => { try {
      const N: any = require('expo-notifications');
      N.setNotificationHandler?.({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }) });
      const st = await N.getPermissionsAsync?.();
      if (st?.granted !== true) await N.requestPermissionsAsync?.();
      const tok = await N.getExpoPushTokenAsync?.();
      if (tok?.data) await apiPost('/api/economy/push-token', { token: tok.data });
    } catch {} })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let ws: WebSocket | null = null; let alive = true; let retry: any = null;
    const connect = () => { try {
      ws = new WebSocket(`${API_BASE_URL.replace(/^http/, 'ws')}/ws/live?user_id=${encodeURIComponent(userId)}`);
      ws.onmessage = (e) => { try { const d = JSON.parse(String(e.data)); if (d?.type === 'presence' && typeof d.energy === 'number') stateBus.patch({ energy: clamp01(d.energy) }); } catch {} };
      ws.onclose = () => { if (alive) retry = setTimeout(connect, 15000); };
      ws.onerror = () => { try { ws?.close(); } catch {} };
    } catch {} };
    connect();
    return () => { alive = false; clearTimeout(retry); try { ws?.close(); } catch {} };
  }, [userId]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const d: any = await apiGet('/api/system/status'); if (alive) { setTele({ n: d?.engines_count ?? 0, hb: d?.last_heartbeat_sec_ago ?? null }); setOnline(true); } } catch { if (alive) setOnline(false); }
    };
    load();
    const iv = setInterval(load, 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const openWing = useCallback(async (key: string) => {
    setActiveWing(key); light(key, 1500);
    try {
      if (key === 'memory') {
        const d: any = await apiGet(`/api/memories?user_id=${userId}`);
        const arr = Array.isArray(d) ? d : (d?.memories || []);
        setWingData(arr.slice(0, 8).map((m: any) => ({ k: m.layer || m.type || 'ذكرى', v: String(m.content || m.text || '').slice(0, 60) })));
      } else if (key === 'goals') {
        const d: any = await apiGet(`/api/goals?user_id=${userId}`);
        const arr = Array.isArray(d) ? d : (d?.goals || []);
        setWingData(arr.slice(0, 8).map((g: any) => ({ k: g.status || 'هدف', v: String(g.title || g.text || '').slice(0, 60) })));
      } else if (key === 'dreams') {
        if (gating && gating.dreams_enabled === false) { setWingData([{ k: 'مقفل 🔒', v: 'ترقية إلى Premium لفتح الأحلام' }]); return; }
        const d: any = await apiGet(`/api/dreams?user_id=${userId}`);
        const arr = Array.isArray(d) ? d : (d?.dreams || []);
        setWingData(arr.slice(0, 8).map((x: any) => ({ k: x.kind || 'حلم', v: String(x.summary || x.text || '').slice(0, 60) })));
      } else if (key === 'perception') {
        const s: any = devicePresenceEngine.getSensors();
        setWingData([
          { k: 'الحركة', v: s.userWalking ? 'يمشي معك' : s.userStationary ? 'ساكن' : 'متحرك' },
          { k: 'الإضاءة', v: String(s.lightLevel ?? '—') },
          { k: 'البطارية', v: `${s.deviceBattery ?? '—'}%` },
          { k: 'الوقت', v: s.isNightTime ? 'ليل' : 'نهار' },
          { k: 'المكان', v: 'غير مفعّل (محلي)' },
        ]);
      } else if (key === 'emotion') {
        const st = stateBus.getState();
        setWingData([
          { k: 'الشعور', v: st.emotionValence > 0.3 ? 'دافئ' : st.emotionValence < -0.3 ? 'متكدر' : 'هادئ' },
          { k: 'الطاقة', v: `${Math.round(st.energy * 100)}%` },
          { k: 'الارتباط', v: `${Math.round(st.connection * 100)}%` },
          { k: 'الفضول', v: `${Math.round(st.curiosity * 100)}%` },
        ]);
      } else {
        setWingData([{ k: 'الحدس', v: 'أتعلم من سياقاتك وستزداد حدسي مع كل حوار.' }]);
      }
    } catch (e: any) {
      setWingData([{ k: 'تنبيه', v: String(e?.message || e).slice(0, 80) }]);
    }
  }, [userId, light, gating]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isThinking) return;
    const text = inputText.trim();
    setInputText('');
    const uid = Date.now().toString();
    const tid = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: uid, sender: 'user', text }, { id: tid, sender: 'twin', text: '' }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    EventBus.emit('USER_SEND_MESSAGE', {});
    stateBus.patch({ thinking: true, listening: false });
    light('intuition');
    setIsThinking(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      const response: any = await brain.sendMessage(text);
      setOnline(true); setDiag('');
      const silence = Number(response?.silence_ms || 0);
      if (silence > 0) await new Promise(r => setTimeout(r, Math.min(silence, 3500)));
      stateBus.patch({ thinking: false });
      const newEmo = String(response?.emotion?.primaryEmotion || response?.twin_emotional_state?.current_emotion || response?.emotion?.primary || response?.emotion || 'calm').toLowerCase();
      if (newEmo !== lastEmotion.current) { lastEmotion.current = newEmo; emotionHaptic(newEmo); }
      if (response?.memory_surfaced) { EventBus.emit('MEMORY_SURFACED', {}); light('memory', 2000); }
      if (response?.goals_updated) light('goals', 2000);
      light('emotion', 1800);
      const replyText = String(response?.reply || response?.text || '...');
      setMessages(prev => prev.map(m => m.id === tid ? { ...m, text: replyText } : m));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      // Voice output is requested from the voice adapter. Do not infer a
      // speaking state or waveform from reply length: only real voice-engine
      // lifecycle events may assert speaking/voiceLevel.
      try {
        if (replyText.length > 2) getVoice()?.speak?.(replyText, newEmo);
      } catch {}
      track('message_sent', { emotion: newEmo, lang });
    } catch (e: any) {
      const isNet = String(e?.message || '').toLowerCase().includes('network');
      const errText = isNet
        ? (lang === 'ar' ? 'يحتاج هذا إلى اتصال. ما زلت هنا.' : 'Needs a connection.')
        : (lang === 'ar' ? 'أنا هنا. أصغي إليك.' : 'I am here.');
      setMessages(prev => prev.map(m => m.id === tid ? { ...m, text: errText } : m));
      stateBus.patch({ thinking: false, speaking: false });
      setDiag(String(e?.message || e).slice(0, 60));
      if (!isNet) setOnline(false);
    } finally {
      setIsThinking(false);
      stateBus.patch({ thinking: false });
    }
  }, [inputText, isThinking, userId, light, lang, brain, gating]);

  const toggleListening = useCallback(() => {
    setDiag(lang === 'ar'
      ? 'التعرّف السحابي على الصوت متوقف حتى إعداد موافقة وخصوصية واضحة.'
      : 'Cloud voice transcription is paused until clear privacy consent is implemented.');
  }, [lang]);

  const accent = isDark ? '#9B6FFF' : '#6B3FD4';
  const bg = isDark ? '#06030F' : '#F5F3FF';
  const card = isDark ? '#120820' : '#FFFFFF';
  const border = isDark ? '#FFFFFF15' : '#00000010';
  const textC = isDark ? '#E8DEFF' : '#1A0840';
  const textSub = isDark ? '#FFFFFF50' : '#00000050';

  const statusLine = tele
    ? (rtl.isRTL
      ? `${tele.n} محركًا • ${tele.hb != null ? `نبض ${tele.hb}ث` : 'نشط'} • ${online ? 'متصل' : 'دون اتصال'}`
      : `${tele.n} engines • ${tele.hb != null ? `${tele.hb}s ago` : 'active'} • ${online ? 'online' : 'offline'}`)
    : (online ? (rtl.isRTL ? 'متصل' : 'online') : (rtl.isRTL ? 'دون اتصال' : 'offline'));

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); } catch {} presenceBridge.touch(); light('emotion', 1500); }}
        onLongPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {} EventBus.emit('OPEN_SOUL_OBSERVATORY', {}); }}
        style={styles.entityWrapper}
      >
        <ConsciousBeing size={Math.min(height * 0.3, 280)} />
      </TouchableOpacity>

      <View style={styles.capBlock}>
        <View style={styles.wingsRow}>
          {WINGS.map(w => (
            <TouchableOpacity
              key={w.key}
              onPress={() => openWing(w.key)}
              style={[styles.wing, { borderColor: border }, wing === w.key && { backgroundColor: accent + '22', borderColor: accent }]}
            >
              <w.Icon size={15} stroke={wing === w.key ? accent : textSub} />
              <Text style={[styles.wingText, { color: wing === w.key ? accent : textSub }]}>
                {rtl.isRTL ? w.label : w.key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.status, { color: textSub }]}>
          {statusLine}{diag ? ` • ${diag}` : ''}
        </Text>
      </View>

      {activeWing && (
        <View style={[styles.panel, { backgroundColor: card + 'EE', borderColor: accent + '33' }]}>
          <View style={styles.panelHead}>
            <Text style={[styles.panelTitle, { color: textC }]}>{WINGS.find(w => w.key === activeWing)?.label}</Text>
            <TouchableOpacity onPress={() => setActiveWing(null)}><X size={20} stroke={textSub} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 180 }}>
            {wingData.length === 0 && <Text style={{ color: textSub, padding: 8 }}>لا بيانات بعد — سأتعلم منك.</Text>}
            {wingData.map((d, i) => (
              <View key={i} style={[styles.panelRow, { borderBottomColor: border }]}>
                <Text style={{ color: accent, fontSize: 11, width: 70 }}>{d.k}</Text>
                <Text style={{ color: textC, fontSize: 13, flex: 1 }}>{d.v}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView ref={scrollRef} style={styles.conversationContainer} contentContainerStyle={{ paddingBottom: 110 }}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.twinBubble, { backgroundColor: msg.sender === 'user' ? accent + '20' : card, borderColor: border }]}>
            <Text style={[styles.msgText, { color: textC }]}>{msg.text || (isThinking && msg.sender === 'twin' ? '...' : '')}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: card, borderColor: border }]}>
        <TouchableOpacity onPress={toggleListening} style={styles.voiceBtn} accessibilityRole="button">
          <Mic size={22} stroke={textSub} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDiag(lang === 'ar'
          ? 'مشاركة الصور والموقع متوقفة حتى اعتماد الموافقة وسياسة الاحتفاظ.'
          : 'Image and location sharing is paused pending approved consent and retention controls.')} style={styles.voiceBtn} accessibilityRole="button">
          <Camera size={22} stroke={textSub} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { textAlign: rtl.textAlign, color: textC }]}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          editable={!isThinking}
          placeholder={rtl.isRTL ? 'اكتب رسالتك...' : 'Write your message...'}
          placeholderTextColor={textSub}
          multiline
        />
        <TouchableOpacity onPress={handleSend} disabled={isThinking} style={styles.voiceBtn}>
          <Send size={22} stroke={isThinking ? textSub : accent} />
        </TouchableOpacity>
      </View>

      <SoulObservatory />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  entityWrapper: { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.34, alignItems: 'center', justifyContent: 'center' },
  capBlock: { position: 'absolute', top: height * 0.33, left: 0, right: 0, alignItems: 'center' },
  wingsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap', paddingHorizontal: 12 },
  wing: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  wingText: { fontSize: 11 },
  status: { marginTop: 6, fontSize: 10, opacity: 0.75, textAlign: 'center', paddingHorizontal: 10 },
  panel: { position: 'absolute', top: height * 0.33 + 66, left: 14, right: 14, borderRadius: 18, borderWidth: 1, padding: 12, zIndex: 5 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  panelTitle: { fontSize: 15, fontWeight: '700' },
  panelRow: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5 },
  conversationContainer: { flex: 1, marginTop: height * 0.33 + 70, paddingHorizontal: 20 },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 20, marginBottom: 8, borderWidth: 0.5 },
  userBubble: { alignSelf: 'flex-end' },
  twinBubble: { alignSelf: 'flex-start' },
  msgText: { fontSize: 16, lineHeight: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, marginHorizontal: 14, marginBottom: 32, borderRadius: 24, borderWidth: 1 },
  voiceBtn: { padding: 8, borderRadius: 20 },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 8, maxHeight: 100 },
});
