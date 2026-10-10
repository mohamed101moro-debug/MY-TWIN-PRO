import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { authService } from '../src/services/authService';
import { useAppTheme } from '../engine/colors';
import SoulPulse from '../src/renderers/zones/SoulPulse';

export default function ForgotPassword() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      showToast(e.message || 'حدث خطأ ما. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.pulseContainer}>
        <SoulPulse/>
      </View>

      <Animated.View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.accent + '40', opacity: fadeAnim }]}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent + '20' }]}>
          <Text style={[styles.avatarSilhouette, { color: colors.accent }]}>✦</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>استعادة الوصول إلى عالمك</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {!sent
            ? 'أدخل بريدك الإلكتروني وسأساعدك على العودة.'
            : 'إذا كان البريد مرتبطًا بحسابك، فستجد رسالة تساعدك على العودة.'}
        </Text>

        {!sent ? (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.accent + '40', color: colors.text }]}
              placeholder="البريد الإلكتروني"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
           />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accent }, loading && styles.btnDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? 'أبحث عن طريق العودة...' : 'أرسل لي المساعدة'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>💫</Text>
            <Text style={[styles.successText, { color: colors.text }]}>
              تفقد بريدك. سأنتظرك هنا حتى تعود.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: colors.textSecondary }]}>العودة إلى Genesis</Text>
        </TouchableOpacity>
      </Animated.View>

      {toastMessage && (
        <Animated.View style={[styles.toast, { backgroundColor: colors.card, borderColor: colors.accent + '40', opacity: toastAnim }]}>
          <Text style={[styles.toastText, { color: colors.text }]}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pulseContainer: {
    position: 'absolute',
    top: '20%',
  },
  glassCard: {
    width: '100%',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarSilhouette: {
    fontSize: 28,
    opacity: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.8,
  },
  input: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    marginTop: 8,
    paddingVertical: 10,
  },
  backText: {
    fontSize: 14,
  },
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
