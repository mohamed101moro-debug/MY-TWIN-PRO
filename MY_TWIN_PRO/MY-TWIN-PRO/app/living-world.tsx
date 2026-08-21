import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { apiPost, apiGet } from '../lib/httpClient';
import { ADMOB } from '../lib/adConfig';
import { useTwinBrain } from '../src/hooks/useTwinBrain';
import { track, initAnalytics } from '../lib/analytics';
import { useRTL } from '../lib/useRTL';
import { useRouter } from 'expo-router';
import { useAppTheme, ThemeColors } from '../engine/colors';
import { useTwinStore } from '../store/useTwinStore';
import { bootstrapCoordinator } from '../src/core/BootstrapCoordinator';
import { session } from '../src/core/SessionHolder';
import { stateBus } from '../src/core/StateBus';
import { presenceBridge, presenceEngine } from '../src/core/PresenceBridge';

import { EventBus } from '../src/core/EventBus';
import { voiceEngine } from '../engine/voice/VoiceEngine';
import { devicePresenceEngine } from '../engine/device/DevicePresenceEngine';
import { sensorContextEngine } from '../engine/sensor/SensorContextEngine';
import { shareVision, sharedPresence } from '../engine/vision/VisionBridge';
import { refreshPlace } from '../engine/place/PlaceBridge';
import { useVoicePresence } from '../src/hooks/useVoicePresence';
import ConsciousBeing from '../src/components/conscious/ConsciousBeing';
import SoulObservatory from '../src/world/SoulObservatory/SoulObservatory';
import { Send, Mic, MicOff, Database, Eye, Heart, Sparkles, Target, Moon, X, Camera } from 'lucide-react-native';
const { height } = Dimensions.get('window');
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.5));
const NET = { ar: 'يحتاج هذا إلى اتصال. ما زلت هنا لكل شيء آخر.', en: 'This needs a connection. I am still here for everything else.' };
const SRV = { ar: 'أنا هنا. أصغي إليك.', en: 'I am here. I listen.' };
const WINGS = [
  { key: 'memory', label: 'الذاكرة', Icon: Database }, { key: 'perception', label: 'الإدراك', Icon: Eye },
  { key: 'emotion', label: 'المشاعر', Icon: Heart }, { key: 'intuition', label: 'الحدس', Icon: Sparkles },
  { key: 'goals', label: 'الأهداف', Icon: Target }, { key: 'dreams', label: 'الأحلام', Icon: Moon },
];
const emotionHaptic = async (em: string) => {
  try {
    if (em.includes('happ') || em.includes('excit') || em.includes('surpr')) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (em.includes('ang')) { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setTimeout(() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} }, 120); }
    else if (em.includes('sad') || em.includes('fear')) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (em.includes('think') || em.includes('focus')) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    else await Haptics.selectionAsync();
  } catch {}
};
const buildPresencePatch = (r: any): any => {
  const em = String(r?.twin_emotional_state?.current_emotion || r?.emotion || 'calm').toLowerCase();
  const intensity = Number(r?.twin_emotional_state?.intensity || r?.intensity || 0.5);
  const valence = em.includes('joy') || em.includes('happ') || em.includes('excit') || em.includes('caring') ? 0.6 + intensity * 0.35
    : em.includes('sad') || em.includes('fear') ? -(0.4 + intensity * 0.35)
    : em.includes('ang') ? -(0.6 + intensity * 0.35) : em.includes('surpr') ? 0.5 : em.includes('curious') ? 0.35 : 0.1;
  const arousal = em.includes('excit') || em.includes('ang') || em.includes('surpr') ? 0.8 + intensity * 0.18 : em.includes('sleep') ? 0.12 : em.includes('calm') ? 0.22 : 0.4 + intensity * 0.25;
  const bond = Number(r?.bond_level ?? 0); const connection = bond > 1 ? bond / 100 : bond;
  return { emotionValence: valence, arousal, curiosity: em.includes('curious') ? 0.85 : 0.45, focus: em.includes('focus') || em.includes('think') ? 0.88 : 0.5, connection: Math.max(stateBus.getState().connection, connection || 0), energy: clamp01(0.5 + intensity * 0.35) };
};
export default function LivingWorld() {
  const userId = useTwinStore(s => s.userId) || '';
  const { colors: _tc } = useAppTheme(); const colors = ThemeColors.dark;
  const rtl = useRTL(); const router = useRouter(); const lang = rtl.isRTL ? 'ar' : 'en';
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; sender: 'user' | 'twin'; text: string }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isVisioning, setIsVisioning] = useState(false);
  const [wing, setWing] = useState<string | null>(null);
  const [activeWing, setActiveWing] = useState<string | null>(null);
  const [wingData, setWingData] = useState<Array<{ k: string; v: string }>>([]);
  const [online, setOnline] = useState(true);
  const [diag, setDiag] = useState('');
  const [tele, setTele] = useState<{ n: number; hb: number | null } | null>(null);
  const [gating, setGating] = useState<any>(null);
  useEffect(() => { const t = setTimeout(() => { try { AsyncStorage.removeItem('mytwin_safe_mode'); } catch {} }, 60000); return () => clearTimeout(t); }, []);
  const msgCount = useRef(0);
  const wingT = useRef<any>(null); const scrollRef = useRef<ScrollView>(null);
  const brain = useTwinBrain(userId, lang);
  const voicePresence = useVoicePresence();
  const lastEmotion = useRef<string>('calm');
  const light = useCallback((w: string, ms = 2600) => { setWing(w); if (wingT.current) clearTimeout(wingT.current); wingT.current = setTimeout(() => setWing(null), ms); }, []);
  useEffect(() => {
    if (voicePresence.isRecording) stateBus.patch({ voiceLevel: voicePresence.level, listening: true });
    else if (!stateBus.getState().speaking) stateBus.patch({ voiceLevel: 0 });
  }, [voicePresence.level, voicePresence.isRecording]);
  useEffect(() => { const cv = setInterval(() => { try { sensorContextEngine.evaluate(); } catch {} }, 30000); return () => clearInterval(cv); }, []);
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const s: any = devicePresenceEngine.getSensors();
        const rawL = s.lightLevel;
        const lightN = rawL == null ? 0.5 : (rawL > 1 ? clamp01(Math.log10(Math.max(1, rawL) + 1) / 3) : clamp01(rawL));
        stateBus.patch({ ambientLight: lightN, movement: s.userWalking ? 0.7 : s.userStationary ? 0 : 0.3, proximity: s.faceDetected ? 0.85 : 0.5, userPresent: !!s.faceDetected });
      } catch {}
    }, 600);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (!userId) return;
    (async () => { try { const d: any = await apiGet('/api/self/absence_summary'); if (d?.summary) setMessages(prev => (prev.length ? prev : [{ id: 'absence', sender: 'twin', text: d.summary }])); } catch {} })();
  }, [userId]);
  const showInterstitial = useCallback(() => {
    msgCount.current += 1;
    if (msgCount.current % 6 !== 0) return;
    try {
      const g: any = require('react-native-google-mobile-ads');
      const ad = g.InterstitialAd.createForAdRequest((ADMOB.useTest ? g.TestIds.INTERSTITIAL : ADMOB.androidInterstitial), { requestNonPersonalizedAdsOnly: true });
      const un = ad.addAdEventListener?.(g.AdEventType.LOADED, () => { try { ad.show(); } catch {} });
      ad.load();
      setTimeout(() => { try { un?.(); } catch {} }, 30000);
    } catch {}
  }, []);
  useEffect(() => { (async () => { try { const o: any = await apiGet('/api/economy/overview'); setGating(o?.gating || null); } catch {} })(); }, [userId]);
  useEffect(() => { (async () => { try { const N: any = require('expo-notifications'); N.setNotificationHandler?.({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }) }); const st = await N.getPermissionsAsync?.(); if (st?.granted !== true) await N.requestPermissionsAsync?.(); const tok = await N.getExpoPushTokenAsync?.(); if (tok?.data) await apiPost('/api/economy/push-token', { token: tok.data }); } catch {} })(); }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let ws: WebSocket | null = null; let alive = true; let retry: any = null;
    const connect = () => { try {
      ws = new WebSocket('wss://my-twin-pro-production.up.railway.app/ws/live?user_id=' + userId);
      ws.onmessage = (e) => { try { const d = JSON.parse(String(e.data)); if (d?.type === 'presence') { const p: any = {}; if (typeof d.energy === 'number') p.energy = clamp01(d.energy); stateBus.patch(p); } } catch {} };
      ws.onclose = () => { if (alive) retry = setTimeout(connect, 15000); };
      ws.onerror = () => { try { ws?.close(); } catch {} };
    } catch {} };
    connect();
    return () => { alive = false; clearTimeout(retry); try { ws?.close(); } catch {} };
  }, [userId]);
  useEffect(() => {
    if (userId) {
      session.userId = userId;
      bootstrapCoordinator.bootstrap().catch(() => {});
      try { initAnalytics(); } catch {}
      try { voiceEngine.start(); } catch {}
      refreshPlace(userId);
      light('perception', 3000);
      (async () => { try { const last = await AsyncStorage.getItem('ritual_day'); const today = new Date().toDateString(); if (last !== today) { const r: any = await apiGet('/api/ritual/next'); if (r?.text) { setMessages(prev => [...prev, { id: 'ritual', sender: 'twin', text: r.text }]); await AsyncStorage.setItem('ritual_day', today); } } } catch {} })();
    }
    const onMem = () => light('memory'); const onMile = () => light('goals');
    const unMem = EventBus.on('MEMORY_SURFACED', onMem); const unMile = EventBus.on('MILESTONE_REACHED', onMile);
    return () => { try { voiceEngine.stop(); } catch {} try { unMem?.(); unMile?.(); } catch {} };
  }, [userId]);
  useEffect(() => {
    let alive = true;
    const load = async () => { try { const d: any = await apiGet('/api/system/status'); if (alive) { setTele({ n: d?.engines_count ?? 0, hb: d?.last_heartbeat_sec_ago ?? null }); setOnline(true); } } catch { if (alive) setOnline(false); } };
    load(); const iv = setInterval(load, 60000);
    const sendSnap = async () => { try { const sn: any = devicePresenceEngine.getSensors(); await apiPost('/api/perception/snapshot', { steps: sn.stepCount, battery: sn.deviceBattery, walking: sn.userWalking, night: sn.isNightTime, audio_level: sn.audioLevel, face_detected: sn.faceDetected, weather: sn.weatherCondition, place: sharedPresence.place || undefined }); } catch {} };
    sendSnap(); const snapIv = setInterval(sendSnap, 300000);
    return () => { alive = false; clearInterval(iv); clearInterval(snapIv); };
  }, []);
  const openWing = useCallback(async (key: string) => {
    setActiveWing(key); light(key, 1500);
    try {
      if (key === 'memory') { const d: any = await apiGet('/api/memories?user_id=' + userId); const arr = Array.isArray(d) ? d : (d?.memories || []); setWingData(arr.slice(0, 8).map((m: any) => ({ k: m.layer || m.type || 'ذكرى', v: String(m.content || m.text || '').slice(0, 60) }))); }
      else if (key === 'goals') { const d: any = await apiGet('/api/goals?user_id=' + userId); const arr = Array.isArray(d) ? d : (d?.goals || []); setWingData(arr.slice(0, 8).map((g: any) => ({ k: g.status || 'هدف', v: String(g.title || g.text || '').slice(0, 60) }))); }
      else if (key === 'dreams') {
        if (gating && gating.dreams_enabled === false) { setWingData([{ k: 'مقفل 🔒', v: 'ترقية إلى Premium لفتح الأحلام' }]); return; } const d: any = await apiGet('/api/dreams?user_id=' + userId); const arr = Array.isArray(d) ? d : (d?.dreams || []); setWingData(arr.slice(0, 8).map((x: any) => ({ k: x.kind || 'حلم', v: String(x.summary || x.text || '').slice(0, 60) }))); }
      else if (key === 'perception') { const s: any = devicePresenceEngine.getSensors(); setWingData([{ k: 'الحركة', v: s.userWalking ? 'يمشي معك' : s.userStationary ? 'ساكن' : 'متحرك' }, { k: 'الإضاءة', v: String(s.lightLevel ?? '—') }, { k: 'البطارية', v: (s.deviceBattery ?? '—') + '%' }, { k: 'الوقت', v: s.isNightTime ? 'ليل' : 'نهار' }, { k: 'المكان', v: sharedPresence.place || 'غير معروف' }]); }
      else if (key === 'emotion') { const st = stateBus.getState(); setWingData([{ k: 'الشعور', v: st.emotionValence > 0.3 ? 'دافئ' : st.emotionValence < -0.3 ? 'متكدر' : 'هادئ' }, { k: 'الطاقة', v: Math.round(st.energy * 100) + '%' }, { k: 'الارتباط', v: Math.round(st.connection * 100) + '%' }, { k: 'الفضول', v: Math.round(st.curiosity * 100) + '%' }]); }
      else setWingData([{ k: 'الحدس', v: 'أتعلم من سياقاتك وستزداد حدسي مع كل حوار.' }]);
    } catch (e: any) { setWingData([{ k: 'تنبيه', v: String(e?.message || e).slice(0, 80) }]); }
  }, [userId, light]);
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isThinking) return;
    const text = inputText.trim(); setInputText('');
    const userMsgId = Date.now().toString(); const twinMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }, { id: twinMsgId, sender: 'twin', text: '' }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    EventBus.emit('USER_SEND_MESSAGE', {});
    stateBus.patch({ thinking: true, focus: 0.8, listening: false });
    light('intuition'); setIsThinking(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      const enriched = (() => { try { return require('../engine/sensor/SensorContextEngine').sensorContextEngine.enrichMessage(text); } catch { return text; } })();
      const response: any = await brain.sendMessage(enriched);
      const silence = Number(response?.silence_ms || 0);
      if (silence > 0) await new Promise(r => setTimeout(r, Math.min(silence, 3500)));
      setOnline(true); setDiag('');
      stateBus.patch({ ...buildPresencePatch(response), thinking: false });
      const newEmotion = String(response?.twin_emotional_state?.current_emotion || response?.emotion || 'calm').toLowerCase();
      try {
        presenceEngine.setEmotion(newEmotion, Number(response?.intensity ?? 0.6));
        presenceEngine.addMicroExpression(newEmotion.includes('joy') ? 'head_nod' : 'membrane_shiver', 0.7);
        if (response?.memory_surfaced) presenceEngine.triggerMemoryEcho();
      } catch {}
      if (newEmotion !== lastEmotion.current) { lastEmotion.current = newEmotion; await emotionHaptic(newEmotion); }
      if (response?.memory_surfaced) { EventBus.emit('MEMORY_SURFACED', {}); light('memory'); }
      light('emotion', 1800);
      const replyText = String(response?.reply || response?.text || '...');
      setMessages(prev => prev.map(m => (m.id === twinMsgId ? { ...m, text: replyText } : m)));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      try {
        if (replyText.length > 2) {
          voiceEngine.speak(replyText, newEmotion);
          presenceBridge.speak(4000);
          const dur = Math.min(replyText.length * 60, 8000);
          stateBus.patch({ speaking: true, voiceLevel: 0.8 });
          setTimeout(() => stateBus.patch({ voiceLevel: 0.45 }), dur * 0.5);
          setTimeout(() => stateBus.patch({ speaking: false, voiceLevel: 0 }), dur);
        }
      } catch {}
      if (gating?.ads_in_chat) showInterstitial();
      track('message_sent', { emotion: newEmotion, lang });
    } catch (e: any) {
      setOnline(false); setDiag(String(e?.message || e).slice(0, 120));
      stateBus.patch({ emotionValence: -0.4, arousal: 0.4, thinking: false, speaking: false, voiceLevel: 0 });
      setMessages(prev => prev.map(m => (m.id === twinMsgId ? { ...m, text: online ? SRV[lang as 'ar'] : NET[lang as 'ar'] } : m)));
    } finally { setIsThinking(false); stateBus.patch({ thinking: false }); }
  }, [inputText, isThinking, userId, light, lang, online]);
  const handleVision = useCallback(async () => {
    if (isVisioning) return;
    setIsVisioning(true); stateBus.patch({ thinking: true });
    try {
      const r = await shareVision(userId, lang);
      if (r) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'twin', text: '👁 ' + r.scene + (r.place ? '\n📍 ' + r.place : '') }]);
        light('intuition'); light('memory');
        try { voiceEngine.speak(r.scene, 'curious'); } catch {}
        stateBus.patch({ curiosity: 0.85, thinking: false });
      }
    } catch (e: any) { setDiag('VISION: ' + String(e?.message || e).slice(0, 60)); stateBus.patch({ thinking: false }); }
    finally { setIsVisioning(false); }
  }, [userId, lang, isVisioning, light]);
  const toggleListening = useCallback(async () => {
    if (isListening) {
      const uri = await voicePresence.stopRecording();
      setIsListening(false); stateBus.patch({ listening: false });
      if (uri) {
        try {
          stateBus.patch({ thinking: true });
          const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const res: any = await apiPost('/api/stt/transcribe', { audio_base64: b64, language: lang, user_id: userId });
          if (res?.text) setInputText(prev => (prev ? prev + ' ' : '') + res.text);
        } catch (e: any) { setDiag('STT: ' + String(e?.message || e).slice(0, 60)); }
        finally { stateBus.patch({ thinking: false }); }
      }
    } else {
      try { const ok = await voicePresence.startRecording(); if (ok) { setIsListening(true); stateBus.patch({ listening: true }); try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} } } catch {}
    }
  }, [isListening, lang, userId, voicePresence]);
  const statusLine = tele
    ? (rtl.isRTL ? tele.n + ' محركًا حيًا • ' + (tele.hb != null ? 'نبض قبل ' + tele.hb + 'ث' : 'النبض نشط') + ' • ' + (online ? 'متصل' : 'دون اتصال') : tele.n + ' engines • ' + (tele.hb != null ? 'beat ' + tele.hb + 's ago' : 'active') + ' • ' + (online ? 'online' : 'offline'))
    : (online ? (rtl.isRTL ? 'متصل' : 'online') : (rtl.isRTL ? 'دون اتصال' : 'offline'));
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity activeOpacity={0.92} onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); } catch {} stateBus.patch({ touch: 1 }); setTimeout(() => stateBus.patch({ touch: 0 }), 900); }} onLongPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {} EventBus.emit('OPEN_SOUL_OBSERVATORY', {}); }} style={styles.entityWrapper}>
        <ConsciousBeing size={Math.min(height * 0.3, 280)} />
      </TouchableOpacity>
      <View style={styles.capBlock}>
        <View style={styles.wingsRow}>
          {WINGS.map(w => (
            <TouchableOpacity key={w.key} onPress={() => openWing(w.key)} style={[styles.wing, { borderColor: colors.border }, wing === w.key && { backgroundColor: colors.accent + '22', borderColor: colors.accent }]}>
              <w.Icon size={15} stroke={wing === w.key ? colors.accent : colors.textSecondary} />
              <Text style={[styles.wingText, { color: wing === w.key ? colors.accent : colors.textSecondary }]}>{rtl.isRTL ? w.label : w.key}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.status, { color: colors.textSecondary }]}>{statusLine}{sharedPresence.place ? ' • 📍 ' + sharedPresence.place : ''}{diag ? ' • ' + diag : ''}</Text>
      </View>
      {activeWing && (
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.panelHead}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>{WINGS.find(w => w.key === activeWing)?.label}</Text>
            <TouchableOpacity onPress={() => setActiveWing(null)}><X size={20} stroke={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 180 }}>
            {wingData.length === 0 && <Text style={{ color: colors.textSecondary, padding: 8 }}>لا بيانات بعد — سأتعلم منك.</Text>}
            {wingData.map((d, i) => (
              <View key={i} style={[styles.panelRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.accent, fontSize: 11, width: 70 }}>{d.k}</Text>
                <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{d.v}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      <ScrollView ref={scrollRef} style={styles.conversationContainer} contentContainerStyle={{ paddingBottom: 110 }}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.twinBubble, { backgroundColor: msg.sender === 'user' ? colors.accent + '20' : colors.card, borderColor: colors.border }]}>
            <Text style={[styles.msgText, { color: colors.text }]}>{msg.text || (isThinking && msg.sender === 'twin' ? '...' : '')}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={toggleListening} style={[styles.voiceBtn, isListening && { backgroundColor: colors.accent + '22' }]}>
          {isListening ? <MicOff size={22} stroke={colors.accent} /> : <Mic size={22} stroke={colors.textSecondary} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { if (gating && gating.vision_enabled === false) { try { router.push('/paywall'); } catch {} } else handleVision(); }} style={styles.voiceBtn}>
          <Camera size={22} stroke={isVisioning ? colors.accent : colors.textSecondary} />
        </TouchableOpacity>
        <TextInput style={[styles.input, { textAlign: rtl.textAlign, color: colors.text }]} value={inputText} onChangeText={setInputText} onSubmitEditing={handleSend} editable={!isThinking} placeholder={rtl.isRTL ? 'اكتب رسالتك...' : 'Write your message...'} placeholderTextColor={colors.textSecondary} multiline />
        <TouchableOpacity onPress={handleSend} disabled={isThinking} style={styles.voiceBtn}><Send size={22} stroke={isThinking ? colors.textSecondary : colors.accent} /></TouchableOpacity>
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
