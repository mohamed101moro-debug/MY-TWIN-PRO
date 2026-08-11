const storage = {};
module.exports = {
  setItem: jest.fn((k, v) => { storage[k] = v; return Promise.resolve(); }),
  getItem: jest.fn((k) => Promise.resolve(storage[k] || null)),
  removeItem: jest.fn((k) => { delete storage[k]; return Promise.resolve(); }),
  multiRemove: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
};
