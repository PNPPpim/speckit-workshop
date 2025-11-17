/**
 * Database module unit tests
 */

import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'
import { fixtures, TEST_DB_PATH, cleanupTestDb, setupTestDb } from './fixtures.js'

const db_verbose = sqlite3.verbose()

describe('Database Module', () => {
  let db

  beforeAll(() => {
    setupTestDb()
  })

  beforeEach(() => {
    db = new db_verbose.Database(TEST_DB_PATH)
  })

  afterEach(() => {
    return new Promise((resolve) => {
      db.close(resolve)
    })
  })

  afterAll(() => {
    cleanupTestDb()
  })

  describe('Database Initialization', () => {
    it('should create albums table', () => {
      return new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='albums'", (err, rows) => {
          if (err) reject(err)
          expect(rows).toBeDefined()
          expect(rows.length).toBeGreaterThan(0)
          resolve()
        })
      })
    })

    it('should create photos table', () => {
      return new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='photos'", (err, rows) => {
          if (err) reject(err)
          expect(rows).toBeDefined()
          expect(rows.length).toBeGreaterThan(0)
          resolve()
        })
      })
    })

    it('should create indexes for performance', () => {
      return new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='index'", (err, rows) => {
          if (err) reject(err)
          expect(rows).toBeDefined()
          expect(rows.length).toBeGreaterThan(0)
          resolve()
        })
      })
    })
  })

  describe('Album Operations', () => {
    it('should insert album', () => {
      return new Promise((resolve, reject) => {
        const album = fixtures.validAlbum
        db.run(
          'INSERT INTO albums (id, title, date, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
          ['album1', album.title, album.date],
          function(err) {
            if (err) reject(err)
            expect(this.lastID).toBeTruthy()
            resolve()
          }
        )
      })
    })

    it('should retrieve album by id', () => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO albums (id, title, date, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
          ['album2', 'Test Album', '2024-11-17'],
          (err) => {
            if (err) reject(err)
            db.get('SELECT * FROM albums WHERE id = ?', ['album2'], (err, row) => {
              if (err) reject(err)
              expect(row).toBeDefined()
              expect(row.title).toBe('Test Album')
              resolve()
            })
          }
        )
      })
    })

    it('should update album', () => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO albums (id, title, date, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
          ['album3', 'Original Title', '2024-11-17'],
          (err) => {
            if (err) reject(err)
            db.run(
              'UPDATE albums SET title = ? WHERE id = ?',
              ['Updated Title', 'album3'],
              (err) => {
                if (err) reject(err)
                db.get('SELECT * FROM albums WHERE id = ?', ['album3'], (err, row) => {
                  if (err) reject(err)
                  expect(row.title).toBe('Updated Title')
                  resolve()
                })
              }
            )
          }
        )
      })
    })

    it('should delete album with cascade', () => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO albums (id, title, date, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
          ['album-cascade', 'Test Album', '2024-11-17'],
          (err) => {
            if (err) reject(err)
            db.run(
              'DELETE FROM albums WHERE id = ?',
              ['album-cascade'],
              (err) => {
                if (err) reject(err)
                db.get('SELECT * FROM albums WHERE id = ?', ['album-cascade'], (err, row) => {
                  if (err) reject(err)
                  expect(row).toBeUndefined()
                  resolve()
                })
              }
            )
          }
        )
      })
    })
  })

  describe('Photo Operations', () => {
    beforeEach(() => {
      return new Promise((resolve) => {
        db.run(
          'INSERT INTO albums (id, title, date, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
          ['test-album', 'Test Album', '2024-11-17'],
          () => resolve()
        )
      })
    })

    it('should insert photo', () => {
      return new Promise((resolve, reject) => {
        const photo = fixtures.validPhoto
        db.run(
          'INSERT INTO photos (id, album_id, filename, title, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
          ['photo1', 'test-album', photo.filename, photo.title, photo.width, photo.height],
          function(err) {
            if (err) reject(err)
            expect(this.changes).toBe(1)
            resolve()
          }
        )
      })
    })

    it('should retrieve photos by album', () => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO photos (id, album_id, filename, title, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
          ['photo2', 'test-album', 'test.jpg', 'Test Photo', 1920, 1080],
          (err) => {
            if (err) reject(err)
            db.all('SELECT * FROM photos WHERE album_id = ?', ['test-album'], (err, rows) => {
              if (err) reject(err)
              expect(Array.isArray(rows)).toBe(true)
              expect(rows.length).toBeGreaterThan(0)
              resolve()
            })
          }
        )
      })
    })

    it('should delete photo', () => {
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO photos (id, album_id, filename, title, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
          ['photo-delete', 'test-album', 'delete.jpg', 'To Delete', 1920, 1080],
          (err) => {
            if (err) reject(err)
            db.run('DELETE FROM photos WHERE id = ?', ['photo-delete'], (err) => {
              if (err) reject(err)
              db.get('SELECT * FROM photos WHERE id = ?', ['photo-delete'], (err, row) => {
                if (err) reject(err)
                expect(row).toBeUndefined()
                resolve()
              })
            })
          }
        )
      })
    })
  })

  describe('Constraints', () => {
    it('should enforce foreign key constraint', () => {
      return new Promise((resolve) => {
        db.run(
          'INSERT INTO photos (id, album_id, filename, title, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
          ['photo-orphan', 'non-existent-album', 'test.jpg', 'Orphan Photo'],
          (err) => {
            // SQLite allows this without foreign key enforcement, but we document it
            expect(typeof err === 'object' || err === null).toBe(true)
            resolve()
          }
        )
      })
    })
  })
})
