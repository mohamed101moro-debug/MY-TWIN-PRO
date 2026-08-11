import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useTwinCoreStore } from '../../../store/useTwinCoreStore';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { Globe, Moon, Volume2, Database, Shield, Bell, Languages } from 'lucide-react-native';

export default function SettingsWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const { calmMode, toggleCalmMode, lang, setLang, theme, toggleTheme } = useTwinCoreStore();
  const isDark = theme === 'dark';
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [memoryRetention, setMemoryRetention] = useState(true);

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
          <Switch value={memoryRetention} onValueChange={setMemoryRetention} trackColor={{ false: colors.border, true: colors.accent + '50' }} thumbColor={memoryRetention ? colors.accent : colors.textSecondary} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>{rtl.isRTL ? 'الإشعارات' : 'Notifications'}</Text>
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Bell size={18} stroke={colors.accent} />
            <Text style={[styles.rowLabel, { color: colors.text }]}>{rtl.isRTL ? 'الإشارات' : 'Signals'}</Text>
          </View>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.border, true: colors.accent + '50' }} thumbColor={notifications ? colors.accent : colors.textSecondary} />
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
});
