import React from 'react';
import { View, StyleSheet } from 'react-native';
import ContextRibbon from '../renderers/zones/ContextRibbon';
import { SPACE } from '../../src/design/tokens/spacing';

export default function ContextOverlay() {
  return (
    <View style={styles.container}>
      <ContextRibbon />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    zIndex: 10,
  },
});
