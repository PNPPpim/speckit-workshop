/**
 * Jest setup file for frontend tests
 */

// Mock localStorage
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
}

// Mock fetch - will be mocked in individual tests
if (!global.fetch) {
  global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
}
