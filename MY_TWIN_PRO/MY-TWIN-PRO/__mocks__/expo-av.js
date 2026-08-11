const mockSound = {
  playAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
  setVolumeAsync: jest.fn().mockResolvedValue(undefined),
  setOnPlaybackStatusUpdate: jest.fn(),
};

const Audio = {
  Sound: {
    createAsync: jest.fn().mockResolvedValue({ sound: { ...mockSound } }),
  },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
};

module.exports = { Audio };
