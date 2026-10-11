const storage = new Map();

module.exports = {
  setItem: jest.fn(async (key, value) => { storage.set(key, value); }),
  getItem: jest.fn(async (key) => storage.has(key) ? storage.get(key) : null),
  removeItem: jest.fn(async (key) => { storage.delete(key); }),
  multiRemove: jest.fn(async (keys) => { keys.forEach((key) => storage.delete(key)); }),
  multiSet: jest.fn(async (entries) => { entries.forEach(([key, value]) => storage.set(key, value)); }),
  multiGet: jest.fn(async (keys) => keys.map((key) => [key, storage.has(key) ? storage.get(key) : null])),
  getAllKeys: jest.fn(async () => [...storage.keys()]),
  clear: jest.fn(async () => { storage.clear(); }),
};
