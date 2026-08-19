import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Dimensions, useColorScheme, Animated } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { apiPost, apiGet } from '../lib/httpClient';
import { useTwinBrain } from '../src/hooks/useTwinBrain';
import { track, initAnalytics } from '../lib/analytics';
import { useRTL } from '../lib/useRTL';
import { useTwinStore } from '../store/useTwinStore';
import { bootstrapCoordinator } from '../src/core/BootstrapCoordinator';
import { session } from '../src/core/SessionHolder';
import { stateBus } from '../src/core/StateBus';
import { presenceEngine } from '../src/core/PresenceBridge';
import { EventBus } from '../src/core/EventBus';
import { voiceEngine } from '../engine/voice/VoiceEngine';
import { devicePresenceEngine } from '../engine/device/DevicePresenceEngine';
import { shareVision, sharedPresence } from '../engine/vision/VisionBridge';
import { refreshPlace } from '../engine/place/PlaceBridge';
import DigitalBeing from '../src/components/conscious/DigitalBeing';
import type { BeingEnv } from '../src/components/conscious/DigitalBeing';
import SoulObservatory from '../src/world/SoulObservatory/SoulObservatory';
import { Send, Mic, MicOff, Database, Eye, Heart, Sparkles, Target, Moon, X, Camera } from 'lucide-react-native';
import type { PresenceState } from '../engine/presence/PresenceTypes';
const { height, width } = Dimensions.get('window');
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.5));
const emotionHaptic = async (emotion: string) => {
  try {
    if (emotion.includes('happ') || emotion.includes('excit') || emotion.includes('surpr')) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (emotion.includes('ang')) { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setTimeout(() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} }, 120); }
    else if (emotion.includes('sad') || emotion.includes('fear') || emotion.includes('afraid')) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (emotion.includes('think') || emotion.includes('focus')) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    else await Haptics.selectionAsync();
  } catch {}
};
const buildPresencePatch = (r: any): any => {
  const em = String(r?.twin_emotional_state?.current_emotion || r?.emotion || 'calm').toLowerCase();
  const intensity = Number(r?.twin_emotional_state?.intensity || r?.intensity || 0.5);
  const valence = em.includes('joy') || em.includes('happ') || em.includes('excit') || em.includes('caring') ? 0.6 + intensity * 0.35
    : em.includes('sad') || em.includes('fear') || em.includes('afraid') ? -(0.4 + intensity * 0.35)
    : em.includes('ang') ? -(0.6 + intensity * 0.35) : em.includes('surpr') ? 0.5 : em.includes('curious') ? 0.35 : 0.1;
  const arousal = em.includes('excit') || em.includes('ang') || em.includes('surpr') ? 0.8 + intensity * 0.18 : em.includes('sleep') ? 0.12 : em.includes('calm') ? 0.22 : 0.4 + intensity * 0.25;
  const bond = Number(r?.bond_level ?? 0); const connection = bond > 1 ? bond / 100 : bond;
  return { emotionValence: valence, arousal, curiosity: em.includes('curious') ? 0.85 : 0.45, focus: em.includes('focus') || em.includes('think') ? 0.88 : 0.5, connection: Math.max(stateBus.getState().connection, connection || 0), energy: clamp01(0.5 + intensity * 0.35) };
};
const WINGS = [
  { key: 'memory', label: 'الذاكرة', Icon: Database }, { key: 'perception', label: 'الإدراك', Icon: Eye },
  { key: 'emotion', label: 'المشاعر', Icon: Heart }, { key: 'intuition', label: 'الحدس', Icon: Sparkles },
  { key: 'goals', label: 'الأهداف', Icon: Target }, { key: 'dreams', label: 'الأحلام', Icon: Moon },
];
export default function LivingWorld() {
  const userId = useTwinStore(s => s.userId) || '';
  const rtl = useRTL(); const lang = rtl.isRTL ? 'ar' : 'en';
  const scheme = useColorScheme(); const isDark = scheme !== 'light';
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
  const [presSnap, setPresSnap] = useState<PresenceState | null>(null);
  const [env, setEnv] = useState<BeingEnv>({ light: 0.5, noise: 0.2, motion: 0, listening: false, camera: false, userNear: true });
  const [born, setBorn] = useState(false);
  const birthOpacity = useRef(new Animated.Value(0)).current;
  const birthScale = useRef(new Animated.Value(0.6)).current;
  const wingT = useRef<any>(null); const scrollRef = useRef<ScrollView>(null);
  const brain = useTwinBrain(userId, lang);
  const lastEmotion = useRef<string>('calm');
  useEffect(() => {
    const timer = setTimeout(() => {
      setBorn(true);
      Animated.parallel([
        Animated.timing(birthOpacity, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.spring(birthScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start(() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); } catch {} });
    }, 400);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    presenceEngine.start();
    const unsub = presenceEngine.subscribe((st: PresenceState) => setPresSnap({ ...st }));
    return () => { unsub(); };
  }, []);
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const s: any = devicePresenceEngine.getSensors();
        const rawL = s.lightLevel;
        const lightN = rawL == null ? 0.5 : (rawL > 1 ? clamp01(Math.log10(Math.max(1, rawL) + 1) / 3) : clamp01(rawL));
        const noise = clamp01(s.audioLevel ?? 0.2);
        const motion = s.userWalking ? 0.7 : s.userStationary ? 0 : 0.3;
        const userNear = !!s.faceDetected;
        setEnv({ light: lightN, noise, motion, listening: isListening, camera: isVisioning, userNear });
        stateBus.patch({ ambientLight: lightN, movement: motion, proximity: userNear ? 0.85 : 0.5, userPresent: userNear });
      } catch {}
    }, 600);
    return () => clearInterval(iv);
  }, [isListening, isVisioning]);
  useEffect(() => {
    if (!userId) return;
    (async () => { try { const d: any = await apiGet('/api/self/absence_summary'); if (d?.summary) setMessages(prev => (prev.length ? prev : [{ id: 'absence', sender: 'twin', text: d.summary }])); } catch {} })();
  }, [userId]);
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
  const light = useCallback((w: string, ms = 2600) => { setWing(w); if (wingT.current) clearTimeout(wingT.current); wingT.current = setTimeout(() => setWing(null), ms); }, []);
  useEffect(() => {
    if (!userId) return;
    session.userId = userId;
    bootstrapCoordinator.bootstrap().catch(() => {});
    try { initAnalytics(); } catch {}
    try { voiceEngine.start(); } catch {}
    refreshPlace(userId);
    light('perception', 3000);
    (async () => { try {
      const last = await AsyncStorage.getItem('ritual_day'); const today = new Date().toDateString();
      if (last !== today) { const r: any = await apiGet('/api/ritual/next'); if (r?.text) { setMessages(prev => [...prev, { id: 'ritual', sender: 'twin', text: r.text }]); await AsyncStorage.setItem('ritual_day', today); } }
    } catch {} })();
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
      else if (key === 'dreams') { const d: any = await apiGet('/api/dreams?user_id=' + userId); const arr = Array.isArray(d) ? d : (d?.dreams || []); setWingData(arr.slice(0, 8).map((x: any) => ({ k: x.kind || 'حلم', v: String(x.summary || x.text || '').slice(0, 60) }))); }
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
      const response: any = await brain.sendMessage(text);
      const silence = Number(response?.silence_ms || 0);
      if (silence > 0) await new Promise(r => setTimeout(r, Math.min(silence, 3500)));
      setOnline(true); setDiag('');
      stateBus.patch({ ...buildPresencePatch(response), thinking: false });
      stateBus.updateFromUnifiedResponse(response);
      const newEmotion = String(response?.twin_emotional_state?.current_emotion || response?.emotion || 'calm').toLowerCase();
      try { presenceEngine.setEmotion(newEmotion, Number(response?.intensity ?? 0.6)); presenceEngine.addMicroExpression(newEmotion.includes('joy') ? 'head_nod' : 'membrane_shiver', 0.7); } catch {}
      if (newEmotion !== lastEmotion.current) { lastEmotion.current = newEmotion; await emotionHaptic(newEmotion); }
      if (response?.memory_surfaced) light('memory', 2000);
      light('emotion', 1800);
      const replyText = String(response?.reply || response?.text || '...');
      setMessages(prev => prev.map(m => (m.id === twinMsgId ? { ...m, text: replyText } : m)));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
      try {
        if (replyText.length > 2) {
          voiceEngine.speak(replyText, newEmotion);
          const dur = Math.min(replyText.length * 60, 8000);
          stateBus.patch({ speaking: true, voiceLevel: 0.8 });
          setTimeout(() => stateBus.patch({ voiceLevel: 0.45 }), dur * 0.5);
          setTimeout(() => stateBus.patch({ speaking: false, voiceLevel: 0 }), dur);
        }
      } catch {}
      track('message_sent', { emotion: newEmotion, lang });
    } catch (e: any) {
      setMessages(prev => prev.map(m => (m.id === twinMsgId ? { ...m, text: online ? (rtl.isRTL ? 'أنا هنا. أصغي إليك.' : 'I am here. I listen.') : (rtl.isRTL ? 'يحتاج هذا إلى اتصال.' : 'This needs a connection.') } : m)));
      stateBus.patch({ thinking: false, speaking: false, voiceLevel: 0 });
      setDiag(String(e?.message || e).slice(0, 60));
    } finally { setIsThinking(false); stateBus.patch({ thinking: false }); }
  }, [inputText, isThinking, userId, light, lang, online, rtl]);
  const handleVision = useCallback(async () => {
    if (isVisioning) return;
    setIsVisioning(true); stateBus.patch({ thinking: true }); setEnv(prev => ({ ...prev, camera: true }));
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
    finally { setIsVisioning(false); setEnv(prev => ({ ...prev, camera: false })); }
  }, [userId, lang, isVisioning, light]);
  const toggleListening = useCallback(async () => {
    if (isListening) {
      const uri = await voiceEngine.stopListening();
      setIsListening(false); stateBus.patch({ listening: false }); setEnv(prev => ({ ...prev, listening: false }));
      if (uri) { try { stateBus.patch({ thinking: true }); const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }); const res: any = await apiPost('/api/stt/transcribe', { audio_base64: b64, language: lang, user_id: userId }); if (res?.text) setInputText(prev => (prev ? prev + ' ' : '') + res.text); } catch (e: any) { setDiag('STT: ' + String(e?.message || e).slice(0, 60)); } finally { stateBus.patch({ thinking: false }); } }
    } else {
      try { await voiceEngine.startListening(); setIsListening(true); stateBus.patch({ listening: true }); setEnv(prev => ({ ...prev, listening: true })); try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} } catch {}
    }
  }, [isListening, lang, userId]);
  const handleBeingTouch = useCallback(() => {
    stateBus.patch({ touch: 1 }); setTimeout(() => stateBus.patch({ touch: 0 }), 900);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); } catch {}
    light('emotion', 1500);
  }, [light]);
  const statusLine = useMemo(() => tele
    ? (rtl.isRTL ? tele.n + ' محركًا حيًا • ' + (tele.hb != null ? 'نبض قبل ' + tele.hb + 'ث' : 'النبض نشط') + ' • ' + (online ? 'متصل' : 'دون اتصال') : tele.n + ' engines • ' + (tele.hb != null ? 'beat ' + tele.hb + 's ago' : 'active') + ' • ' + (online ? 'online' : 'offline'))
    : (online ? (rtl.isRTL ? 'متصل' : 'online') : (rtl.isRTL ? 'دون اتصال' : 'offline')), [tele, online, rtl]);
  const beingSize = Math.min(height * 0.33, width * 0.85, 300);
  const ACC = isDark ? '#9B6FFF' : '#6B3FD4';
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: isDark ? '#06030F' : '#F5F3FF' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={[styles.entityWrapper, { height: height * 0.35 }, { opacity: birthOpacity, transform: [{ scale: birthScale }] }]}>
        <TouchableOpacity activeOpacity={0.92} onPress={handleBeingTouch} onLongPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {} EventBus.emit('OPEN_SOUL_OBSERVATORY', {}); }} style={styles.beingTouchable}>
          {presSnap && <DigitalBeing presence={presSnap} size={beingSize} isDark={isDark} env={env} maturity={0.85} />}
        </TouchableOpacity>
        {isThinking && (
          <View style={styles.thinkingRow}>
            <View style={[styles.thinkDot, { backgroundColor: ACC }]} />
            <View style={[styles.thinkDot, { backgroundColor: ACC, opacity: 0.6 }]} />
            <View style={[styles.thinkDot, { backgroundColor: ACC, opacity: 0.3 }]} />
          </View>
        )}
      </Animated.View>
      <View style={styles.capBlock}>
        <View style={styles.wingsRow}>
          {WINGS.map(w => (
            <TouchableOpacity key={w.key} onPress={() => openWing(w.key)} style={[styles.wing, { borderColor: isDark ? '#FFFFFF15' : '#00000010' }, wing === w.key && { backgroundColor: ACC + '22', borderColor: ACC }]}>
              <w.Icon size={15} stroke={wing === w.key ? ACC : (isDark ? '#FFFFFF60' : '#00000060')} />
              <Text style={[styles.wingText, { color: wing === w.key ? ACC : (isDark ? '#FFFFFF60' : '#00000060') }]}>{rtl.isRTL ? w.label : w.key}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.status, { color: isDark ? '#FFFFFF40' : '#00000040' }]}>{statusLine}{sharedPresence.place ? ' • 📍 ' + sharedPresence.place : ''}{diag ? ' • ' + diag : ''}</Text>
      </View>
      {activeWing && (
        <View style={[styles.panel, { backgroundColor: isDark ? '#120820EE' : '#FFFFFFEE', borderColor: isDark ? '#9B6FFF33' : '#6B3FD433' }]}>
          <View style={styles.panelHead}>
            <Text style={[styles.panelTitle, { color: isDark ? '#E8DEFF' : '#2A1060' }]}>{WINGS.find(w => w.key === activeWing)?.label}</Text>
            <TouchableOpacity onPress={() => setActiveWing(null)}><X size={20} stroke={isDark ? '#FFFFFF60' : '#00000060'} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 180 }}>
            {wingData.length === 0 && <Text style={{ color: isDark ? '#FFFFFF50' : '#00000050', padding: 8 }}>لا بيانات بعد — سأتعلم منك.</Text>}
            {wingData.map((d, i) => (
              <View key={i} style={[styles.panelRow, { borderBottomColor: isDark ? '#FFFFFF10' : '#00000010' }]}>
                <Text style={{ color: ACC, fontSize: 11, width: 70 }}>{d.k}</Text>
                <Text style={{ color: isDark ? '#E8DEFF' : '#2A1060', fontSize: 13, flex: 1 }}>{d.v}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      <ScrollView ref={scrollRef} style={styles.conversationContainer} contentContainerStyle={{ paddingBottom: 120 }}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.twinBubble, { backgroundColor: msg.sender === 'user' ? ACC + '20' : (isDark ? '#FFFFFF0D' : '#00000008'), borderColor: msg.sender === 'user' ? ACC + '44' : (isDark ? '#FFFFFF15' : '#00000010') }]}>
            <Text style={[styles.msgText, { color: isDark ? '#E8DEFF' : '#1A0840' }]}>{msg.text || (isThinking && msg.sender === 'twin' ? '...' : '')}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A0F2E' : '#FFFFFF', borderColor: isDark ? '#9B6FFF33' : '#6B3FD422' }]}>
        <TouchableOpacity onPress={toggleListening} style={[styles.voiceBtn, isListening && { backgroundColor: ACC + '22' }]}>
          {isListening ? <MicOff size={22} stroke={ACC} /> : <Mic size={22} stroke={isDark ? '#FFFFFF50' : '#00000050'} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleVision} style={styles.voiceBtn}>
          <Camera size={22} stroke={isVisioning ? ACC : (isDark ? '#FFFFFF50' : '#00000050')} />
        </TouchableOpacity>
        <TextInput style={[styles.input, { textAlign: rtl.textAlign, color: isDark ? '#E8DEFF' : '#1A0840' }]} value={inputText} onChangeText={setInputText} onSubmitEditing={handleSend} editable={!isThinking} placeholder={rtl.isRTL ? 'اكتب رسالتك...' : 'Write your message...'} placeholderTextColor={isDark ? '#FFFFFF30' : '#00000030'} multiline />
        <TouchableOpacity onPress={handleSend} disabled={isThinking} style={styles.sendBtn}>
          <Send size={22} stroke={isThinking ? (isDark ? '#FFFFFF30' : '#00000030') : ACC} />
        </TouchableOpacity>
      </View>
      <SoulObservatory />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  entityWrapper: { alignItems: 'center', justifyContent: 'center' },
  beingTouchable: { alignItems: 'center', justifyContent: 'center' },
  thinkingRow: { flexDirection: 'row', gap: 6, marginTop: 8, justifyContent: 'center' },
  thinkDot: { width: 6, height: 6, borderRadius: 3 },
  capBlock: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 4 },
  wingsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  wing: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  wingText: { fontSize: 11 },
  status: { marginTop: 5, fontSize: 10, textAlign: 'center' },
  panel: { marginHorizontal: 14, marginBottom: 6, borderRadius: 18, borderWidth: 1, padding: 12 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  panelTitle: { fontSize: 15, fontWeight: '700' },
  panelRow: { flexDirection: 'row', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5 },
  conversationContainer: { flex: 1, paddingHorizontal: 16 },
  bubble: { maxWidth: '82%', padding: 14, borderRadius: 20, marginBottom: 8, borderWidth: 0.5 },
  userBubble: { alignSelf: 'flex-end' },
  twinBubble: { alignSelf: 'flex-start' },
  msgText: { fontSize: 16, lineHeight: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, marginHorizontal: 14, marginBottom: 32, borderRadius: 24, borderWidth: 1 },
  voiceBtn: { padding: 8, borderRadius: 20 },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 8, maxHeight: 100 },
  sendBtn: { padding: 8 },
});
