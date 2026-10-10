import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Heart, Shield, FileText, Mail, Globe, Brain, AlertTriangle } from 'lucide-react-native';
import { LEGAL } from '../../services/LegalDocuments';

export default function AboutWing() {
  const rtl = useRTL();
  const isAr = rtl.isRTL;
  const privacy = LEGAL.privacy;
  const terms = LEGAL.terms;
  const ai = LEGAL.ai_disclaimer;
  const del = LEGAL.delete_account;
  const exportData = LEGAL.export_data;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* My Twin Identity */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Heart size={36} stroke="#EC4899" />
        </View>
        <Text style={styles.heroTitle}>My Twin</Text>
        <Text style={styles.heroVersion}>{isAr ? 'الإصدار' : 'Version'} {LEGAL.version}</Text>
        <Text style={styles.heroSubtitle}>
          {isAr ? 'رفيق رقمي مستمر يتطور معك' : 'A persistent digital companion that grows with you'}
        </Text>
      </View>

      <Text style={styles.builtBy}>
        {isAr ? 'بنته' : 'Built by'} Soul Sync
      </Text>

      {/* Privacy Policy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{isAr ? privacy.title_ar : privacy.title_en}</Text>
        {(isAr ? privacy.sections_ar : [
          { title: 'Data Collection', body: 'We only collect data necessary to operate the service: email, conversations, and preferences.' },
          { title: 'Data Usage', body: 'We use your data to provide the service. Messages and necessary context may be sent to the configured cloud AI provider to process a request.' },
          { title: 'Data Storage', body: 'Some account and continuity data is stored on service infrastructure. Consult the privacy policy for retention and deletion details; do not assume a request is complete until its result is confirmed.' },
          { title: 'Service Providers', body: 'Hosting and AI providers may process data needed to provide the service. We do not sell your personal data; consult the privacy policy for provider details.' },
          { title: 'Memory Privacy', body: 'Memory supports continuity. Do not treat a deletion request as complete until the service confirms the outcome.' },
          { title: 'Voice Privacy', body: 'Cloud speech transcription is temporarily disabled until explicit, revocable per-user consent is implemented. Sensor and voice processing should not be assumed to be entirely local.' },
        ]).map((s, i) => (
          <View key={i} style={styles.card}>
            <Shield size={16} stroke="#A78BFA" />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardBody}>{s.body}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.rightsText}>{isAr ? privacy.rights_ar : 'You may request access, export, or deletion through the available support channel. We will state the outcome and any exceptions instead of treating an incomplete operation as successful.'}</Text>
      </View>

      {/* Terms of Service */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{isAr ? terms.title_ar : terms.title_en}</Text>
        {(isAr ? terms.sections_ar : [
          { title: 'Acceptance of Terms', body: 'By using My Twin, you agree to be bound by these terms.' },
          { title: 'Intellectual Property', body: 'All content, software, and designs are owned by Soul Sync Ltd.' },
          { title: 'Subscriptions', body: 'We offer various subscription plans. Subscriptions auto-renew unless cancelled 24h before.' },
          { title: 'Disclaimer', body: 'My Twin is a digital entity. It does not provide medical, legal, or financial advice.' },
        ]).map((s, i) => (
          <View key={i} style={styles.card}>
            <FileText size={16} stroke="#A78BFA" />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardBody}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* AI Disclaimer */}
      <View style={styles.aiCard}>
        <Brain size={18} stroke="#F59E0B" />
        <Text style={styles.aiText}>{isAr ? ai.body_ar : 'My Twin is an interactive digital entity using AI to simulate interaction and continuity; this is not proof of subjective consciousness. Responses may contain errors. Do not rely on it as the sole source of medical, legal, or financial information.'}</Text>
      </View>

      {/* Delete Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{isAr ? del.title_ar : del.title_en}</Text>
        <View style={styles.card}>
          <AlertTriangle size={16} stroke="#EF4444" />
          <View style={styles.cardContent}>
            <Text style={[styles.cardBody, { color: '#EF4444' }]}>
              {isAr ? del.body_ar : 'You may submit an account deletion request. The account may first be disabled before final deletion; the process is not complete until you receive a result. Consult the privacy policy for timing and exceptions.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Export Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{isAr ? exportData.title_ar : exportData.title_en}</Text>
        <View style={styles.card}>
          <Globe size={16} stroke="#10B981" />
          <View style={styles.cardContent}>
            <Text style={[styles.cardBody, { color: '#10B981' }]}>
              {isAr ? exportData.body_ar : 'You may request a copy of your data through the available support channel. The response should provide a downloadable file or clearly list any data that could not be exported.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Contact */}
      <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${privacy.contact}`)}>
        <Mail size={18} stroke="#A855F7" />
        <Text style={styles.contactText}>{privacy.contact}</Text>
      </TouchableOpacity>

      <Text style={styles.copyright}>{LEGAL.copyright}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: SPACE.lg, gap: SPACE.sm },
  heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#EC489920', justifyContent: 'center', alignItems: 'center' },
  heroTitle: { color: '#E8E0F0', fontSize: 24, fontWeight: '800' },
  heroVersion: { color: '#6B5B8A', fontSize: 13 },
  heroSubtitle: { color: '#A78BFA', fontSize: 14, marginTop: 4 },
  builtBy: { color: '#A78BFA', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: SPACE.lg },
  section: { marginBottom: SPACE.lg, gap: SPACE.sm },
  sectionTitle: { color: '#A78BFA', fontSize: 15, fontWeight: '700', marginBottom: SPACE.sm },
  card: { flexDirection: 'row', backgroundColor: 'rgba(26,18,38,0.8)', borderRadius: RADIUS.sm, padding: SPACE.md, gap: SPACE.sm },
  cardContent: { flex: 1 },
  cardTitle: { color: '#E8E0F0', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  cardBody: { color: '#6B5B8A', fontSize: 12, lineHeight: 18 },
  rightsText: { color: '#10B981', fontSize: 12, textAlign: 'center', marginTop: SPACE.sm },
  aiCard: { flexDirection: 'row', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: RADIUS.sm, padding: SPACE.md, gap: SPACE.sm, marginBottom: SPACE.lg, alignItems: 'flex-start' },
  aiText: { color: '#F59E0B', fontSize: 12, flex: 1, lineHeight: 18 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, paddingVertical: SPACE.md },
  contactText: { color: '#A855F7', fontSize: 13 },
  copyright: { color: '#6B5B8A', fontSize: 11, textAlign: 'center', marginTop: SPACE.sm, paddingBottom: SPACE.xl },
});
