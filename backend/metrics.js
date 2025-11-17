/**
 * Performance Monitoring Module
 * Tracks metrics like load times, database timing, error rates
 */

// Metrics storage
const metrics = {
  requests: [],
  errors: [],
  database: [],
  performance: {
    startTime: Date.now(),
    uptime: 0,
    totalRequests: 0,
    totalErrors: 0,
    totalDatabaseQueries: 0,
    avgResponseTime: 0,
    avgDatabaseTime: 0,
    errorRate: 0
  }
}

// Keep last N entries to avoid memory bloat
const MAX_METRIC_ENTRIES = 1000

/**
 * Record HTTP request
 * @param {Object} options
 *   - method: HTTP method
 *   - path: Request path
 *   - status: Response status code
 *   - duration: Request duration in ms
 *   - size: Response size in bytes
 */
export function recordRequest(options) {
  const { method, path, status, duration, size } = options

  const entry = {
    timestamp: Date.now(),
    method,
    path,
    status,
    duration,
    size
  }

  metrics.requests.push(entry)
  if (metrics.requests.length > MAX_METRIC_ENTRIES) {
    metrics.requests.shift()
  }

  // Update aggregates
  metrics.performance.totalRequests++
  metrics.performance.avgResponseTime =
    (metrics.performance.avgResponseTime * (metrics.performance.totalRequests - 1) + duration) /
    metrics.performance.totalRequests

  // Track errors
  if (status >= 400) {
    recordError({
      type: 'HTTP',
      status,
      path,
      timestamp: entry.timestamp
    })
  }
}

/**
 * Record database query
 * @param {Object} options
 *   - query: SQL query
 *   - duration: Query duration in ms
 *   - rowsAffected: Number of rows affected
 */
export function recordDatabaseQuery(options) {
  const { query, duration, rowsAffected } = options

  const entry = {
    timestamp: Date.now(),
    query,
    duration,
    rowsAffected
  }

  metrics.database.push(entry)
  if (metrics.database.length > MAX_METRIC_ENTRIES) {
    metrics.database.shift()
  }

  // Update aggregates
  metrics.performance.totalDatabaseQueries++
  metrics.performance.avgDatabaseTime =
    (metrics.performance.avgDatabaseTime * (metrics.performance.totalDatabaseQueries - 1) + duration) /
    metrics.performance.totalDatabaseQueries
}

/**
 * Record error
 * @param {Object} options
 *   - type: Error type ('HTTP', 'Database', 'Validation', etc.)
 *   - message: Error message
 *   - status: Error status code
 *   - path: Request path
 */
export function recordError(options) {
  const { type, message, status, path } = options

  const entry = {
    timestamp: Date.now(),
    type,
    message,
    status,
    path
  }

  metrics.errors.push(entry)
  if (metrics.errors.length > MAX_METRIC_ENTRIES) {
    metrics.errors.shift()
  }

  // Update error rate
  metrics.performance.totalErrors++
  metrics.performance.errorRate =
    (metrics.performance.totalErrors / metrics.performance.totalRequests) * 100
}

/**
 * Get current metrics
 * @returns {Object}
 */
export function getMetrics() {
  metrics.performance.uptime = Date.now() - metrics.performance.startTime

  return {
    ...metrics.performance,
    requests: metrics.requests.slice(-100), // Last 100 requests
    errors: metrics.errors.slice(-100), // Last 100 errors
    database: metrics.database.slice(-100), // Last 100 queries
    status: 'healthy'
  }
}

/**
 * Get slow queries
 * @param {number} threshold - Time threshold in ms
 * @returns {Array}
 */
export function getSlowQueries(threshold = 100) {
  return metrics.database
    .filter((entry) => entry.duration > threshold)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
}

/**
 * Get slowest requests
 * @param {number} threshold - Time threshold in ms
 * @returns {Array}
 */
export function getSlowestRequests(threshold = 500) {
  return metrics.requests
    .filter((entry) => entry.duration > threshold)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
}

/**
 * Get error statistics
 * @returns {Object}
 */
export function getErrorStats() {
  const errorsByType = {}
  const errorsByStatus = {}

  metrics.errors.forEach((error) => {
    // Count by type
    errorsByType[error.type] = (errorsByType[error.type] || 0) + 1

    // Count by status
    if (error.status) {
      errorsByStatus[error.status] = (errorsByStatus[error.status] || 0) + 1
    }
  })

  return {
    total: metrics.performance.totalErrors,
    rate: metrics.performance.errorRate,
    byType: errorsByType,
    byStatus: errorsByStatus
  }
}

/**
 * Get database statistics
 * @returns {Object}
 */
export function getDatabaseStats() {
  const queryTypes = {}
  let totalTime = 0
  let fastestTime = Infinity
  let slowestTime = 0

  metrics.database.forEach((entry) => {
    // Extract query type
    const match = entry.query.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i)
    const type = match ? match[1].toUpperCase() : 'OTHER'
    queryTypes[type] = (queryTypes[type] || 0) + 1

    totalTime += entry.duration
    fastestTime = Math.min(fastestTime, entry.duration)
    slowestTime = Math.max(slowestTime, entry.duration)
  })

  return {
    total: metrics.performance.totalDatabaseQueries,
    avgTime: metrics.performance.avgDatabaseTime,
    fastestTime: fastestTime === Infinity ? 0 : fastestTime,
    slowestTime,
    byType: queryTypes
  }
}

/**
 * Export metrics as JSON for analysis
 * @returns {Object}
 */
export function exportMetrics() {
  return {
    timestamp: new Date().toISOString(),
    performance: metrics.performance,
    errors: getErrorStats(),
    database: getDatabaseStats(),
    requests: metrics.requests.slice(-100),
    slowQueries: getSlowQueries(),
    slowRequests: getSlowestRequests()
  }
}

/**
 * Reset metrics
 */
export function resetMetrics() {
  metrics.requests = []
  metrics.errors = []
  metrics.database = []
  metrics.performance = {
    startTime: Date.now(),
    uptime: 0,
    totalRequests: 0,
    totalErrors: 0,
    totalDatabaseQueries: 0,
    avgResponseTime: 0,
    avgDatabaseTime: 0,
    errorRate: 0
  }
}

/**
 * Create middleware for Express to track requests
 * @returns {Function}
 */
export function createMetricsMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now()

    // Intercept res.end to capture response
    const originalEnd = res.end
    res.end = function (chunk, encoding) {
      const duration = Date.now() - startTime
      const size = chunk ? chunk.length : 0

      recordRequest({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        size
      })

      originalEnd.call(this, chunk, encoding)
    }

    next()
  }
}

/**
 * Create middleware for tracking database queries
 * Decorator for database functions
 * @param {Function} queryFn - Database query function
 * @returns {Function}
 */
export function createDatabaseMetricsWrapper(queryFn) {
  return async function wrappedQuery(...args) {
    const startTime = Date.now()

    try {
      const result = await queryFn.apply(this, args)
      const duration = Date.now() - startTime

      recordDatabaseQuery({
        query: args[0],
        duration,
        rowsAffected: result?.changes || 0
      })

      return result
    } catch (err) {
      const duration = Date.now() - startTime

      recordError({
        type: 'Database',
        message: err.message,
        path: args[0]
      })

      throw err
    }
  }
}
