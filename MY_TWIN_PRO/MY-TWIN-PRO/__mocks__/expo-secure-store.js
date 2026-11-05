const values = new Map();

module.exports = {
  AFTER_FIRST_UNLOCK: 'afterFirstUnlock',
  getItemAsync: jest.fn(async (key) => values.get(key) ?? null),
  setItemAsync: jest.fn(async (key, value) => { values.set(key, value); }),
  deleteItemAsync: jest.fn(async (key) => { values.delete(key); }),
  __reset: () => values.clear(),
  __seed: (key, value) => values.set(key, value),
  __read: (key) => values.get(key),
};
