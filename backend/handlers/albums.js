import express from 'express'
import { all, get, run } from '../db.js'
import {
  validateAlbumCreate,
  validateAlbumUpdate,
  validateAlbumReorder,
  validateId,
  ApiError
} from '../validation.js'

const router = express.Router()

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Get all albums
router.get('/', async (req, res, next) => {
  try {
    const albums = await all(
      `SELECT id, date, title, photo_count, order_index, created_at, updated_at 
       FROM albums 
       ORDER BY order_index ASC`
    )
    res.json(albums)
  } catch (err) {
    next(err)
  }
})

// Get single album
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // Validate ID
    if (!validateId(id)) {
      return res.status(400).json({
        error: 'Invalid album ID',
        timestamp: new Date().toISOString()
      })
    }

    const album = await get(
      `SELECT id, date, title, photo_count, order_index, created_at, updated_at 
       FROM albums 
       WHERE id = ?`,
      [id]
    )

    if (!album) {
      return res.status(404).json({
        error: 'Album not found',
        timestamp: new Date().toISOString()
      })
    }

    res.json(album)
  } catch (err) {
    next(err)
  }
})

// Create album
router.post('/', async (req, res, next) => {
  try {
    const { date, title } = req.body
    
    // Validate input
    const validation = validateAlbumCreate({ date, title })
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
        timestamp: new Date().toISOString()
      })
    }

    const id = generateId()
    const orderResult = await all('SELECT MAX(order_index) as max FROM albums')
    const orderIndex = (orderResult[0]?.max || 0) + 1

    await run(
      `INSERT INTO albums (id, date, title, order_index) 
       VALUES (?, ?, ?, ?)`,
      [id, date, title, orderIndex]
    )

    const album = await get('SELECT * FROM albums WHERE id = ?', [id])
    res.status(201).json(album)
  } catch (err) {
    next(err)
  }
})

// Update album
router.put('/:id', async (req, res, next) => {
  try {
    const { title } = req.body
    const { id } = req.params

    // Validate ID
    if (!validateId(id)) {
      return res.status(400).json({
        error: 'Invalid album ID',
        timestamp: new Date().toISOString()
      })
    }

    // Validate input
    const validation = validateAlbumUpdate({ title })
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
        timestamp: new Date().toISOString()
      })
    }

    // Check if album exists
    const existingAlbum = await get('SELECT * FROM albums WHERE id = ?', [id])
    if (!existingAlbum) {
      return res.status(404).json({
        error: 'Album not found',
        timestamp: new Date().toISOString()
      })
    }

    await run(
      `UPDATE albums SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [title, id]
    )

    const album = await get('SELECT * FROM albums WHERE id = ?', [id])
    res.json(album)
  } catch (err) {
    next(err)
  }
})

// Reorder albums
router.put('/order/update', async (req, res, next) => {
  try {
    const { albumIds } = req.body

    // Validate input
    const validation = validateAlbumReorder({ albumIds })
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
        timestamp: new Date().toISOString()
      })
    }

    // Verify all album IDs exist
    for (const id of albumIds) {
      const album = await get('SELECT id FROM albums WHERE id = ?', [id])
      if (!album) {
        return res.status(404).json({
          error: `Album not found: ${id}`,
          timestamp: new Date().toISOString()
        })
      }
    }

    // Update order_index for each album
    for (let i = 0; i < albumIds.length; i++) {
      await run(
        `UPDATE albums SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [i, albumIds[i]]
      )
    }

    const albums = await all(
      `SELECT id, date, title, photo_count, order_index 
       FROM albums 
       ORDER BY order_index ASC`
    )

    res.json(albums)
  } catch (err) {
    next(err)
  }
})

// Delete album
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // Validate ID
    if (!validateId(id)) {
      return res.status(400).json({
        error: 'Invalid album ID',
        timestamp: new Date().toISOString()
      })
    }

    // Delete photos first
    await run('DELETE FROM photos WHERE album_id = ?', [id])

    // Delete album
    const result = await run('DELETE FROM albums WHERE id = ?', [id])

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Album not found',
        timestamp: new Date().toISOString()
      })
    }

    res.json({
      message: 'Album deleted successfully',
      id,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    next(err)
  }
})

export default router
