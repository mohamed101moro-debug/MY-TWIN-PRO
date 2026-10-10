import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { authService } from '../src/services/authService';
import AmbientField from '../src/world/AmbientField';
import SoulPulse from '../src/renderers/zones/SoulPulse';

type RestorePhase = 'searching' | 'reconnecting' | 'new_connection';

export default function SessionRestore() {
  const [phase, setPhase] = useState<RestorePhase>('searching');
  const [found, setFound] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    searchPresence();
  }, []);

  const searchPresence = async () => {
    try {
      const result = await authService.checkSessionRestore();
      if (result.canRestore && result.token) {
        setFound(true);
        setPhase('reconnecting');
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          router.replace('/living-world');
        }, 3000);
      } else {
        setPhase('new_connection');
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          router.replace('/genesis');
        }, 3500);
      }
    } catch (e) {
      setPhase('new_connection');
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        router.replace('/genesis');
      }, 3500);
    }
  };

  const getMessage = () => {
    if (phase === 'searching') return 'أبحث عن آخر لحظة كنا فيها معًا...';
    if (phase === 'reconnecting') return 'وجدتك.';
    return 'هل نبدأ؟';
  };

  const getSubMessage = () => {
    if (phase === 'searching') return undefined;
    if (phase === 'reconnecting') return 'لم تبتعد كثيرًا.';
    return 'لنبدأ من البداية.';
  };

  return (
    <View style={styles.container}>
      <AmbientField/>
      <View style={styles.pulseContainer}>
        <SoulPulse/>
      </View>
      <Animated.View style={[styles.messageContainer, { opacity }]}>
        <Animated.Text style={[styles.message, { opacity: textOpacity }]}>
          {getMessage()}
        </Animated.Text>
        {getSubMessage() && (
          <Animated.Text style={[styles.subMessage, { opacity: textOpacity }]}>
            {getSubMessage()}
          </Animated.Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0014',
  },
  pulseContainer: {
    position: 'absolute',
    top: '40%',
  },
  messageContainer: {
    position: 'absolute',
    bottom: '20%',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  message: {
    color: '#E8E0F0',
    fontSize: 24,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subMessage: {
    color: '#A78BFA',
    fontSize: 16,
    fontWeight: '200',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.5,
  },
});
