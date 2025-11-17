/**
 * Test utilities and fixtures for backend testing
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../test.db')

/**
 * Clean up test database before/after tests
 */
function cleanupTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }
}

/**
 * Create test database with schema
 */
function setupTestDb() {
  cleanupTestDb()
  return TEST_DB_PATH
}

/**
 * Test fixtures
 */
const fixtures = {
  validAlbum: {
    title: 'Test Album',
    date: '2024-11-17'
  },
  invalidAlbum: {
    title: '', // Empty title
    date: '2024-11-17'
  },
  validPhoto: {
    filename: 'test.jpg',
    title: 'Test Photo',
    width: 1920,
    height: 1080
  },
  invalidPhoto: {
    filename: '', // Empty filename
    title: 'Invalid Photo'
  },
  albums: [
    { id: 'album1', title: 'Album 1', date: '2024-11-17', photo_count: 5 },
    { id: 'album2', title: 'Album 2', date: '2024-11-16', photo_count: 3 },
    { id: 'album3', title: 'Album 3', date: '2024-11-15', photo_count: 8 }
  ],
  photos: [
    { id: 'photo1', album_id: 'album1', filename: 'photo1.jpg', title: 'Photo 1' },
    { id: 'photo2', album_id: 'album1', filename: 'photo2.jpg', title: 'Photo 2' },
    { id: 'photo3', album_id: 'album2', filename: 'photo3.jpg', title: 'Photo 3' }
  ]
}

export {
  TEST_DB_PATH,
  cleanupTestDb,
  setupTestDb,
  fixtures
}
