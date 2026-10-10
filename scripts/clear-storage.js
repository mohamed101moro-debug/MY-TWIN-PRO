const AsyncStorage = require('@react-native-async-storage/async-storage').default;

AsyncStorage.clear()
  .then(() => console.log('✅ AsyncStorage cleared successfully'))
  .catch((e) => console.error('❌ Failed to clear AsyncStorage:', e));
