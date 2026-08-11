import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTwinStore } from '../../../store/useTwinStore';
import { useAppTheme } from '../../../engine/colors';
import { useRTL } from '../../../lib/useRTL';
import { SPACE, RADIUS } from '../../../src/design/tokens/spacing';
import { HelpCircle, RefreshCw, Download, AlertTriangle, RotateCcw, MessageCircle, Mail } from 'lucide-react-native';

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
  },
};

export default function HelpWing() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const t = CONTENT[rtl.isRTL ? 'ar' : 'en'];
  const { reset: resetStore } = useTwinStore();

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

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <RefreshCw size={18} stroke={colors.accent} />
        <Text style={[styles.actionText, { color: colors.accent }]}>{t.sync}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Download size={18} stroke={colors.accent} />
        <Text style={[styles.actionText, { color: colors.accent }]}>{t.export}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
