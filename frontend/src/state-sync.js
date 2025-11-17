/**
 * State Synchronization Module
 * Keeps UI in sync with state changes, handles optimistic updates and rollback
 */

import { store } from './store.js'

// Track current render state
let currentRenderState = null
let isRendering = false

// Debounce timer
let renderTimeout = null
const RENDER_DEBOUNCE_MS = 50 // Wait for multiple updates before rendering

/**
 * Initialize state synchronization
 * @param {Function} renderFn - Render callback when state changes
 * @returns {Function} Unsubscribe function
 */
export function initStateSync(renderFn) {
  currentRenderState = store.getState()

  // Subscribe to all state changes
  const unsubscribe = store.subscribe((oldState, newState) => {
    // Debounce renders to avoid excessive updates
    clearTimeout(renderTimeout)
    renderTimeout = setTimeout(() => {
      try {
        currentRenderState = newState
        isRendering = true
        renderFn(newState, oldState)
        isRendering = false
      } catch (err) {
        console.error('Error during render:', err)
        isRendering = false
      }
    }, RENDER_DEBOUNCE_MS)
  })

  return unsubscribe
}

/**
 * Perform optimistic update with automatic rollback
 * @param {Object} options
 *   - updateFn: Function that updates state optimistically
 *   - serverFn: Async function that confirms with server
 *   - rollbackFn: Function to restore previous state (optional)
 * @returns {Promise}
 */
export async function performOptimisticUpdate(options) {
  const { updateFn, serverFn, rollbackFn } = options

  const oldState = getState()

  try {
    // Apply optimistic update
    setLoading(true)
    updateFn()

    // Confirm with server
    const result = await serverFn()

    setLoading(false)
    return result
  } catch (err) {
    // Rollback state and show error
    if (rollbackFn) {
      rollbackFn()
    }
    setLoading(false)
    setError(`Update failed: ${err.message}`)
    throw err
  }
}

/**
 * Batch multiple state updates
 * Only triggers one render at the end
 * @param {Function} updateFn - Function that calls multiple setState calls
 */
export function batchUpdates(updateFn) {
  clearTimeout(renderTimeout)
  updateFn()
  // Render will be triggered after debounce
}

/**
 * Check if currently rendering
 * @returns {boolean}
 */
export function isCurrentlyRendering() {
  return isRendering
}

/**
 * Get current UI state
 * @returns {Object}
 */
export function getCurrentRenderState() {
  return currentRenderState
}

/**
 * Perform update with optimistic UI
 * Shows loading state, updates UI immediately, confirms with server
 * @param {Object} options
 */
export async function withOptimisticUI(options) {
  const { updateUI, rollbackUI, confirmWithServer, onError } = options

  try {
    // Optimistic UI update
    updateUI()

    // Confirm with server
    await confirmWithServer()
  } catch (err) {
    // Rollback and show error
    if (rollbackUI) {
      rollbackUI()
    }
    if (onError) {
      onError(err)
    }
    throw err
  }
}

/**
 * Efficient DOM diffing - compare old and new render states
 * Returns only the changed parts
 * @param {Object} oldState
 * @param {Object} newState
 * @returns {Object} Changed paths and values
 */
export function diffState(oldState, newState) {
  const changes = {}

  const keys = new Set([
    ...Object.keys(oldState || {}),
    ...Object.keys(newState || {})
  ])

  for (const key of keys) {
    const oldVal = oldState?.[key]
    const newVal = newState?.[key]

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = {
        old: oldVal,
        new: newVal
      }
    }
  }

  return changes
}

/**
 * Check if only minimal changes occurred
 * Used to decide if full re-render is needed
 * @param {Object} changes - Result from diffState
 * @returns {boolean}
 */
export function isMinimalChange(changes) {
  const minimalFields = ['loading', 'error']
  const changedFields = Object.keys(changes)
  return changedFields.every((field) => minimalFields.includes(field))
}
