import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Platform } from 'react-native';
import GameScreen from './src/screens/GameScreen';
import { configureAudio } from './src/services/audio';

export default function App() {
  useEffect(() => {
    configureAudio();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <GameScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#dff3ff',
    // Na web, só escondemos qualquer estouro por segurança
    ...(Platform.OS === 'web' ? { overflow: 'hidden' as const } : {}),
  },
});
