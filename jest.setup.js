global.__DEV__ = true;
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// منع تحميل أي ملف صوتي حقيقي
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn().mockResolvedValue(undefined),
          stopAsync: jest.fn().mockResolvedValue(undefined),
          unloadAsync: jest.fn().mockResolvedValue(undefined),
          setVolumeAsync: jest.fn().mockResolvedValue(undefined),
          setOnPlaybackStatusUpdate: jest.fn(),
          getStatusAsync: jest.fn().mockResolvedValue({ isLoaded: true }),
        },
      }),
    },
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  },
}));

// منع require() لملفات الصوت
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/)) {
    return 'mocked-audio-file';
  }
  if (id.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    return 'mocked-image-file';
  }
  return originalRequire.apply(this, arguments);
};
