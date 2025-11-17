import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { all, get, run } from '../db.js'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Generate thumbnail versions of an image
 * Creates thumb (150x150) and medium (400x400) sized versions
 * @param {string} filepath - Path to original image
 * @param {string} filename - Original filename (without path)
 */
async function generateThumbnails(filepath, filename) {
  const uploadsDir = path.join(__dirname, '../uploads')
  const filenameWithoutExt = path.parse(filename).name
  const ext = path.parse(filename).ext

  try {
    // Create thumbnails directory if it doesn't exist
    const thumbDir = path.join(uploadsDir, 'thumbnails')
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true })
    }

    // Generate thumbnail (150x150)
    const thumbPath = path.join(thumbDir, `${filenameWithoutExt}_thumb${ext}`)
    await sharp(filepath)
      .resize(150, 150, { fit: 'cover', withoutEnlargement: true })
      .toFile(thumbPath)

    // Generate medium (400x400)
    const mediumPath = path.join(uploadsDir, `${filenameWithoutExt}_medium${ext}`)
    await sharp(filepath)
      .resize(400, 400, { fit: 'cover', withoutEnlargement: true })
      .toFile(mediumPath)
  } catch (err) {
    // Log but don't fail upload if thumbnails fail
    console.warn(`Failed to generate thumbnails for ${filename}:`, err.message)
  }
}

// Get photos by album
router.get('/album/:albumId', async (req, res, next) => {
  try {
    const { albumId } = req.params

    if (!albumId) {
      return res.status(400).json({
        error: 'Album ID is required',
        timestamp: new Date().toISOString()
      })
    }

    // Verify album exists
    const album = await get('SELECT id FROM albums WHERE id = ?', [albumId])
    if (!album) {
      return res.status(404).json({
        error: 'Album not found',
        timestamp: new Date().toISOString()
      })
    }

    const photos = await all(
      `SELECT id, album_id, filename, title, size, width, height, date_taken, uploaded_at 
       FROM photos 
       WHERE album_id = ? 
       ORDER BY uploaded_at DESC`,
      [albumId]
    )
    res.json(photos)
  } catch (err) {
    next(err)
  }
})

// Get single photo
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        error: 'Photo ID is required',
        timestamp: new Date().toISOString()
      })
    }

    const photo = await get(
      `SELECT id, album_id, filename, title, size, width, height, date_taken, uploaded_at 
       FROM photos 
       WHERE id = ?`,
      [id]
    )

    if (!photo) {
      return res.status(404).json({
        error: 'Photo not found',
        timestamp: new Date().toISOString()
      })
    }

    res.json(photo)
  } catch (err) {
    next(err)
  }
})

// Upload photos
router.post('/upload', upload.array('photos', 50), async (req, res, next) => {
  try {
    const { albumId } = req.body

    if (!albumId) {
      return res.status(400).json({
        error: 'albumId is required',
        timestamp: new Date().toISOString()
      })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        timestamp: new Date().toISOString()
      })
    }

    // Verify album exists
    const album = await get('SELECT * FROM albums WHERE id = ?', [albumId])
    if (!album) {
      return res.status(404).json({
        error: 'Album not found',
        timestamp: new Date().toISOString()
      })
    }

    const uploadedPhotos = []
    const failedPhotos = []

    for (const file of req.files) {
      try {
        const photoId = generateId()
        const filepath = path.join(__dirname, '../uploads', file.filename)

        // Get image metadata
        const metadata = await sharp(filepath).metadata()

        // Generate thumbnails
        await generateThumbnails(filepath, file.filename)

        const photoData = {
          id: photoId,
          album_id: albumId,
          filename: file.filename,
          title: path.parse(file.originalname).name,
          original_filename: file.originalname,
          size: file.size,
          width: metadata.width,
          height: metadata.height,
          date_taken: new Date().toISOString()
        }

        // Insert into database
        await run(
          `INSERT INTO photos (id, album_id, filename, title, original_filename, size, width, height, date_taken)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            photoData.id,
            photoData.album_id,
            photoData.filename,
            photoData.title,
            photoData.original_filename,
            photoData.size,
            photoData.width,
            photoData.height,
            photoData.date_taken
          ]
        )

        uploadedPhotos.push(photoData)
      } catch (err) {
        console.error(`Error processing ${file.filename}:`, err.message)
        failedPhotos.push({
          filename: file.originalname,
          error: err.message
        })
      }
    }

    // Update album photo count
    const photoCount = await get(
      'SELECT COUNT(*) as count FROM photos WHERE album_id = ?',
      [albumId]
    )
    await run(
      'UPDATE albums SET photo_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [photoCount.count, albumId]
    )

    const response = {
      uploaded: uploadedPhotos,
      timestamp: new Date().toISOString()
    }

    if (failedPhotos.length > 0) {
      response.failed = failedPhotos
    }

    res.status(201).json(response)
  } catch (err) {
    next(err)
  }
})

// Delete photo
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        error: 'Photo ID is required',
        timestamp: new Date().toISOString()
      })
    }

    const photo = await get(
      'SELECT filename, album_id FROM photos WHERE id = ?',
      [id]
    )

    if (!photo) {
      return res.status(404).json({
        error: 'Photo not found',
        timestamp: new Date().toISOString()
      })
    }

    // Delete file
    const filepath = path.join(__dirname, '../uploads', photo.filename)
    if (fs.existsSync(filepath)) {
      try {
        fs.unlinkSync(filepath)
      } catch (err) {
        console.warn(`Failed to delete file ${photo.filename}:`, err.message)
      }
    }

    // Delete from database
    await run('DELETE FROM photos WHERE id = ?', [id])

    // Update album photo count
    const photoCount = await get(
      'SELECT COUNT(*) as count FROM photos WHERE album_id = ?',
      [photo.album_id]
    )
    await run(
      'UPDATE albums SET photo_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [photoCount.count, photo.album_id]
    )

    res.json({
      message: 'Photo deleted successfully',
      id,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    next(err)
  }
})

export default router
