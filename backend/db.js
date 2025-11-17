import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'data.db')

let db

export function getDB() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err)
      } else {
        console.log('✓ Connected to SQLite database')
      }
    })
  }
  return db
}

export async function initDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDB()

    database.serialize(() => {
      // Albums table
      database.run(
        `CREATE TABLE IF NOT EXISTS albums (
          id TEXT PRIMARY KEY,
          date DATE NOT NULL UNIQUE,
          title TEXT NOT NULL,
          photo_count INTEGER DEFAULT 0,
          order_index INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) console.error('Albums table error:', err)
          else console.log('✓ Albums table ready')
        }
      )

      // Photos table
      database.run(
        `CREATE TABLE IF NOT EXISTS photos (
          id TEXT PRIMARY KEY,
          album_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          title TEXT NOT NULL,
          original_filename TEXT,
          size INTEGER,
          width INTEGER,
          height INTEGER,
          date_taken DATE,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (album_id) REFERENCES albums(id)
        )`,
        (err) => {
          if (err) console.error('Photos table error:', err)
          else console.log('✓ Photos table ready')
        }
      )

      // Album order table
      database.run(
        `CREATE TABLE IF NOT EXISTS album_order (
          id INTEGER PRIMARY KEY,
          album_ids TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) console.error('Album order table error:', err)
          else console.log('✓ Album order table ready')
        }
      )

      // Create indexes
      database.run(
        'CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id)',
        (err) => {
          if (err) console.error('Index creation error:', err)
          else console.log('✓ Indexes created')
        }
      )

      database.run('CREATE INDEX IF NOT EXISTS idx_albums_date ON albums(date)', (err) => {
        if (err) console.error('Date index error:', err)
      })
    })

    database.close((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().run(sql, params, function(err) {
      if (err) reject(err)
      else resolve({ id: this.lastID, changes: this.changes })
    })
  })
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows || [])
    })
  })
}
