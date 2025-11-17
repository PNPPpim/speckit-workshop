import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase } from './db.js'
import albumHandlers from './handlers/albums.js'
import photoHandlers from './handlers/photos.js'
import { createMetricsMiddleware, getMetrics, exportMetrics } from './metrics.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Performance metrics middleware
app.use(createMetricsMiddleware())

// Initialize database
await initDatabase()

// Routes
app.use('/api/albums', albumHandlers)
app.use('/api/photos', photoHandlers)

// Metrics endpoints
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = getMetrics()
    res.json(metrics)
  } catch (error) {
    console.error('Error retrieving metrics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      details: error.message
    })
  }
})

app.get('/api/metrics/export', (req, res) => {
  try {
    const report = exportMetrics()
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename=metrics-report.json')
    res.send(JSON.stringify(report, null, 2))
  } catch (error) {
    console.error('Error exporting metrics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to export metrics',
      details: error.message
    })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 handler (before error handler)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    timestamp: new Date().toISOString()
  })
})

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()}:`, err)

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large. Maximum size is 50MB',
      timestamp: new Date().toISOString()
    })
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files. Maximum 50 files per upload',
      timestamp: new Date().toISOString()
    })
  }

  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({
      error: err.message,
      timestamp: new Date().toISOString()
    })
  }

  // Custom API errors
  if (err.name === 'ApiError') {
    return res.status(err.status || 500).json({
      error: err.message,
      timestamp: new Date().toISOString()
    })
  }

  // Generic error handling
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message,
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📸 Photo uploads at http://localhost:${PORT}/uploads`)
  console.log(`💾 SQLite database: ${path.join(__dirname, 'data.db')}`)
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`)
})

export default app
