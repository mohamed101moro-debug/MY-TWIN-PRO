import React, { useState } from 'react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useTwinStore } from '../../../store/useTwinStore';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { HelpCircle, RefreshCw, Download, AlertTriangle, RotateCcw } from 'lucide-react-native';

const CONTENT = {
  ar: {
    title: 'المساعدة والاستعادة',
    faq: [
      { q: 'كيف أتحدث مع توأمي؟', a: 'اكتب في المحادثة في أي وقت. توأمك موجود.' },
      { q: 'كيف أغير اسم توأمي؟', a: 'يمكنك تغييره من الإعدادات.' },
    ],
    sync: 'إعادة مزامنة البيانات',
    export: 'تصدير الذكريات',
    report: 'الإبلاغ عن مشكلة',
    reset: 'إعادة ضبط العلاقة',
    resetMsg: 'سيتم حذف كل الذكريات والعلاقة. لا يمكن التراجع.',
    contact: 'الدعم: support@soulsync.com',
    exporting: 'جارٍ تجهيز ملف التصدير…',
    exportReady: 'تم تجهيز ملف التصدير.',
    exportScopeWarning: 'تنبيه: لم يُثبت بعد أن الملف يشمل كل فئات بيانات الحساب. لا تعتمد عليه كنسخة تصدير كاملة حتى اكتمال التحقق.',
    exportUnavailable: 'ميزة مشاركة الملفات غير متاحة على هذا الجهاز.',
    exportFailed: 'تعذر إنشاء ملف التصدير بالكامل. لم يتم حفظ ملف ناقص. حاول لاحقًا أو تواصل مع الدعم.',
  },
  en: {
    title: 'Help & Recovery',
    faq: [
      { q: 'How do I talk to my Twin?', a: 'Write in the chat anytime. Your Twin is there.' },
      { q: 'How do I rename my Twin?', a: 'You can change it from Settings.' },
    ],
    sync: 'Resync Data',
    export: 'Export Memories',
    report: 'Report a Problem',
    reset: 'Reset Relationship',
    resetMsg: 'All memories and relationship will be deleted. This is irreversible.',
    contact: 'Support: support@soulsync.com',
    exporting: 'Preparing your export file…',
    exportReady: 'The export file was prepared.',
    exportScopeWarning: 'Important: coverage of every account-data category has not yet been verified. Do not treat this as a complete account export until validation is finished.',
    exportUnavailable: 'File sharing is not available on this device.',
    exportFailed: 'The complete export file could not be created. No partial file was saved. Please try again or contact support.',
  },
};

export default function HelpWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const t = CONTENT[rtl.isRTL ? 'ar' : 'en'];
  const { reset: resetStore } = useTwinStore();
  const [isExporting, setIsExporting] = useState(false);
  const handleSync = async () => { try { const { bootstrapCoordinator } = require('../../core/BootstrapCoordinator'); await bootstrapCoordinator.bootstrap(); Alert.alert('✅', t.sync); } catch { Alert.alert('⚠️', t.contact); } };
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    let fileUri: string | null = null;
    try {
      // The backend derives identity exclusively from the bearer token.
      const { apiGet } = require('../../../lib/httpClient');
      const exportData = await apiGet('/api/account/export', 60000);
      if (!exportData || typeof exportData !== 'object' || !exportData.data || !Number.isFinite(exportData.total_records)) {
        throw new Error('Invalid export response');
      }
      const directory = FileSystem.cacheDirectory;
      if (!directory) throw new Error('Export file storage is unavailable');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fileUri = `${directory}mytwin-data-export-${stamp}.json`;
      const serialized = JSON.stringify(exportData, null, 2);
      await FileSystem.writeAsStringAsync(fileUri, serialized, { encoding: FileSystem.EncodingType.UTF8 });
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists || !info.size || info.size < 2) throw new Error('Export file verification failed');
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        fileUri = null;
        Alert.alert('⚠️', t.exportUnavailable);
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: t.export,
        UTI: 'public.json',
      });
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      fileUri = null;
      Alert.alert('✅', `${t.exportReady} (${exportData.total_records} records)\n\n${t.exportScopeWarning}`);
    } catch (error) {
      console.warn('[HelpWing] Account export failed:', error instanceof Error ? error.message : 'unknown error');
      // Remove any partial/failed local artifact; the API itself is fail-closed.
      if (fileUri) {
        try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch { /* best effort cleanup */ }
      }
      Alert.alert('⚠️', t.exportFailed);
    } finally {
      setIsExporting(false);
    }
  };
  const handleReport = () => { Linking.openURL('mailto:support@soulsync.com'); };

  const handleReset = () => {
    Alert.alert(
      rtl.isRTL ? 'إعادة ضبط' : 'Reset',
      t.resetMsg,
      [
        { text: rtl.isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: rtl.isRTL ? 'إعادة ضبط' : 'Reset', style: 'destructive', onPress: () => {
          // ✅ بدلاً من memoryEngine، نستخدم إعادة التعيين الكامل من المتجر
          resetStore();
        }},
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>

      {t.faq.map((item, i) => (
        <View key={i} style={[styles.faqCard, { backgroundColor: colors.card }]}>
          <View style={styles.faqHeader}>
            <HelpCircle size={18} stroke={colors.accent} />
            <Text style={[styles.faqQ, { color: colors.text }]}>{item.q}</Text>
          </View>
          <Text style={[styles.faqA, { color: colors.textSecondary }]}>{item.a}</Text>
        </View>
      ))}

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleSync}>
      <RefreshCw size={18} stroke={colors.accent} />
        <Text style={[styles.actionText, { color: colors.accent }]}>{t.sync}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleExport} disabled={isExporting} accessibilityRole="button" accessibilityState={{ disabled: isExporting }}>
      <Download size={18} stroke={colors.accent} />
        <Text style={[styles.actionText, { color: colors.accent }]}>{isExporting ? t.exporting : t.export}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleReport}>
      <AlertTriangle size={18} stroke={colors.gold} />
        <Text style={[styles.actionText, { color: colors.gold }]}>{t.report}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.danger + '30' }]} onPress={handleReset}>
        <RotateCcw size={18} stroke={colors.danger} />
        <Text style={[styles.actionText, { color: colors.danger }]}>{t.reset}</Text>
      </TouchableOpacity>

      <Text style={[styles.contact, { color: colors.textSecondary }]}>{t.contact}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACE.md },
  title: { fontSize: 18, fontWeight: '700' },
  faqCard: { borderRadius: RADIUS.sm, padding: SPACE.md, gap: 6 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  faqQ: { fontSize: 14, fontWeight: '600' },
  faqA: { fontSize: 13, lineHeight: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.md, borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: '500' },
  contact: { fontSize: 12, textAlign: 'center', marginTop: SPACE.sm },
});
