export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main.js',
    '!node_modules/**'
  ],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  transform: {}
}
