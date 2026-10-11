import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTwinCoreStore } from '../../../store/useTwinCoreStore';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Globe, Moon, Volume2, Database, Shield, Bell } from 'lucide-react-native';
import { CloudAIConsentSnapshot, CloudAIPurposeConsent, getCloudAIConsents, setCloudAIConsent } from '../../../src/services/CloudAIConsentService';

function CloudAIConsentSettings({ colors, isRTL }: { colors: any; isRTL: boolean }) {
  const [snapshot, setSnapshot] = useState<CloudAIConsentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await getCloudAIConsents());
      setError(null);
    } catch {
      setSnapshot(null);
      setError(isRTL ? 'تعذر تحميل إعدادات موافقة الذكاء الاصطناعي.' : 'Could not load AI consent settings.');
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(() => { void refresh(); }, [refresh]);

  const changeConsent = async (purpose: CloudAIPurposeConsent['key'], provider: string, granted: boolean) => {
    if (!snapshot || (!snapshot.grants_available && granted)) return;
    const key = `${purpose}:${provider}`;
    setPending(key);
    setError(null);
    try {
      await setCloudAIConsent(purpose, provider, granted, snapshot.policy_version);
      await refresh();
    } catch {
      setError(isRTL ? 'لم يُحفظ التغيير. تحقق من الاتصال ثم أعد المحاولة.' : 'The change was not saved. Check the connection and try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={styles.consentBox}>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text accessibilityRole="alert" style={[styles.consentNotice, { color: colors.textSecondary }]}>{error}</Text> : null}
      {!loading && snapshot && !snapshot.grants_available ? (
        <Text style={[styles.consentNotice, { color: colors.textSecondary }]}>
          {isRTL
            ? 'لم يُعتمد إشعار الخصوصية النهائي لمزودي الذكاء الاصطناعي بعد؛ لذلك لا يمكن منح موافقة سحابية الآن.'
            : 'The final privacy notice for AI providers is not approved yet, so cloud consent cannot be granted now.'}
        </Text>
      ) : null}
      {snapshot?.purposes.map((purpose) => (
        <View key={purpose.key} style={styles.purposeGroup}>
          <Text style={[styles.purposeTitle, { color: colors.text }]}>{purpose.title}</Text>
          <Text style={[styles.consentNotice, { color: colors.textSecondary }]}>{purpose.description}</Text>
          {purpose.providers.map((provider) => {
            const key = `${purpose.key}:${provider.key}`;
            return (
              <View key={key} style={[styles.providerRow, { borderColor: colors.border }]}>
                <Text style={[styles.providerName, { color: colors.text }]}>{provider.name}</Text>
                <Switch
                  accessibilityRole="switch"
                  accessibilityLabel={`${purpose.title}: ${provider.name}`}
                  disabled={pending !== null || (!snapshot.grants_available && !provider.granted)}
                  value={provider.granted}
                  onValueChange={(value) => void changeConsent(purpose.key, provider.key, value)}
                  trackColor={{ false: colors.border, true: colors.accent + '50' }}
                  thumbColor={provider.granted ? colors.accent : colors.textSecondary}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function SettingsWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const { calmMode, toggleCalmMode, lang, setLang, theme, toggleTheme, voiceEnabled, setVoiceEnabled, notificationsEnabled, setNotificationsEnabled, memoryRetentionEnabled, setMemoryRetentionEnabled } = useTwinCoreStore();
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>{rtl.isRTL ? 'الإعدادات' : 'Settings'}</Text>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>{rtl.isRTL ? 'المظهر' : 'Appearance'}</Text>
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Moon size={18} stroke={colors.accent} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{rtl.isRTL ? 'الوضع الداكن' : 'Dark Mode'}</Text>
          </View>
          <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: colors.border, true: colors.accent + '50' }} thumbColor={isDark ? colors.accent : colors.textSecondary} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>{rtl.isRTL ? 'الصوت' : 'Voice'}</Text>
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Volume2 size={18} stroke={colors.accent} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{rtl.isRTL ? 'الصوت' : 'Voice'}</Text>
          </View>
          <Switch value={voiceEnabled} onValueChange={setVoiceEnabled} trackColor={{ false: colors.border, true: colors.accent + '50' }} thumbColor={voiceEnabled ? colors.accent : colors.textSecondary} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>{rtl.isRTL ? 'اللغة' : 'Language'}</Text>
        <TouchableOpacity style={[styles.langBtn, { backgroundColor: colors.card }]} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          <Globe size={18} stroke={colors.accent} />
          <Text style={[styles.langText, { color: colors.text }]}>{lang === 'ar' ? 'العربية' : 'English'}</Text>
          <Text style={[styles.langSwitch, { color: colors.accent }]}>{rtl.isRTL ? 'تغيير' : 'Switch'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>{rtl.isRTL ? 'الذاكرة' : 'Memory'}</Text>
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Database size={18} stroke={colors.accent} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{rtl.isRTL ? 'الاحتفاظ بالذكريات' : 'Memory Retention'}</Text>
          </View>
          <Switch value={memoryRetentionEnabled} onValueChange={setMemoryRetentionEnabled} trackColor={{ false: colors.border, true: colors.accent + '50' }} thumbColor={memoryRetentionEnabled ? colors.accent : colors.textSecondary} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>{rtl.isRTL ? 'الإشعارات' : 'Notifications'}</Text>
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Bell size={18} stroke={colors.accent} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{rtl.isRTL ? 'الإشارات' : 'Signals'}</Text>
          </View>
          <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: colors.border, true: colors.accent + '50' }} thumbColor={notificationsEnabled ? colors.accent : colors.textSecondary} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>{rtl.isRTL ? 'الخصوصية' : 'Privacy'}</Text>
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Shield size={18} stroke={colors.accent} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{rtl.isRTL ? 'وضع الهدوء' : 'Calm Mode'}</Text>
          </View>
          <Switch value={calmMode} onValueChange={toggleCalmMode} trackColor={{ false: colors.border, true: colors.accent + '50' }} thumbColor={calmMode ? colors.accent : colors.textSecondary} />
        </View>
        <CloudAIConsentSettings colors={colors} isRTL={rtl.isRTL} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.lg },
  title: { fontSize: 18, fontWeight: '700', marginBottom: SPACE.sm },
  section: { gap: SPACE.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: RADIUS.sm, padding: SPACE.md },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  langBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: RADIUS.sm, padding: SPACE.md },
  langText: { fontSize: 14, fontWeight: '500', flex: 1, marginLeft: SPACE.sm },
  langSwitch: { fontSize: 13, fontWeight: '600' },
  consentBox: { gap: SPACE.md, paddingHorizontal: SPACE.sm },
  purposeGroup: { gap: SPACE.xs },
  purposeTitle: { fontSize: 13, fontWeight: '700' },
  consentNotice: { fontSize: 12, lineHeight: 18 },
  providerRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  providerName: { fontSize: 13, fontWeight: '500' },
});
