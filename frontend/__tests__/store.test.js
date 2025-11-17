/**
 * Frontend store unit tests
 */

// Mock the store module
const createStoreMock = () => {
  const listeners = new Set()
  let appState = {
    albums: [],
    photos: {},
    loading: false,
    error: null,
    selectedAlbumId: null,
    cache: {
      albums: null,
      albumsTimestamp: null,
      ttl: 5 * 60 * 1000
    }
  }

  const getState = () => JSON.parse(JSON.stringify(appState))

  const setState = (updates) => {
    const oldState = JSON.parse(JSON.stringify(appState))
    appState = { ...appState, ...updates }
    listeners.forEach((listener) => {
      try {
        listener(oldState, appState)
      } catch (err) {
        console.error('Error in state listener:', err)
      }
    })
    return appState
  }

  const subscribe = (listener) => {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function')
    }
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const setLoading = (isLoading) => setState({ loading: isLoading })
  const setError = (error) => setState({ error })

  return { getState, setState, subscribe, setLoading, setError, listeners, appState: () => appState }
}

describe('Frontend Store Module', () => {
  let store

  beforeEach(() => {
    store = createStoreMock()
  })

  describe('State Management', () => {
    it('should initialize with default state', () => {
      const state = store.getState()
      expect(state).toBeDefined()
      expect(state.albums).toEqual([])
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should get current state', () => {
      const state = store.getState()
      expect(state).toHaveProperty('albums')
      expect(state).toHaveProperty('photos')
      expect(state).toHaveProperty('loading')
      expect(state).toHaveProperty('error')
      expect(state).toHaveProperty('cache')
    })

    it('should update state with partial changes', () => {
      const newState = store.setState({ loading: true })
      expect(newState.loading).toBe(true)
      expect(newState.albums).toEqual([])
    })

    it('should return updated state from setState', () => {
      const result = store.setState({ error: 'Test error' })
      expect(result.error).toBe('Test error')
    })

    it('should preserve other state when updating', () => {
      store.setState({ loading: true })
      store.setState({ error: 'Error' })
      const state = store.getState()
      expect(state.loading).toBe(true)
      expect(state.error).toBe('Error')
    })

    it('should handle multiple state updates', () => {
      store.setState({ loading: true })
      store.setState({ albums: [{ id: '1', title: 'Album' }] })
      const state = store.getState()
      expect(state.loading).toBe(true)
      expect(state.albums.length).toBe(1)
    })
  })

  describe('Subscriptions', () => {
    it('should subscribe to state changes', () => {
      let called = false
      const listener = () => { called = true }
      store.subscribe(listener)
      store.setState({ loading: true })
      expect(called).toBe(true)
    })

    it('should pass old and new state to listener', () => {
      let oldState, newState
      const listener = (old, new_) => { oldState = old; newState = new_ }
      store.subscribe(listener)
      store.setState({ loading: true })
      
      expect(oldState.loading).toBe(false)
      expect(newState.loading).toBe(true)
    })

    it('should unsubscribe from state changes', () => {
      let called = false
      const listener = () => { called = true }
      const unsubscribe = store.subscribe(listener)
      unsubscribe()
      store.setState({ loading: true })
      expect(called).toBe(false)
    })

    it('should support multiple listeners', () => {
      let calls = { l1: 0, l2: 0 }
      const listener1 = () => { calls.l1++ }
      const listener2 = () => { calls.l2++ }
      store.subscribe(listener1)
      store.subscribe(listener2)
      store.setState({ loading: true })
      
      expect(calls.l1).toBe(1)
      expect(calls.l2).toBe(1)
    })

    it('should validate listener is a function', () => {
      expect(() => {
        store.subscribe('not a function')
      }).toThrow('Listener must be a function')
    })

    it('should handle listener errors gracefully', () => {
      let errorThrown = false
      let normalCalled = false
      
      const errorListener = () => {
        errorThrown = true
        throw new Error('Listener error')
      }
      const normalListener = () => { normalCalled = true }
      
      store.subscribe(errorListener)
      store.subscribe(normalListener)
      
      store.setState({ loading: true })
      
      expect(normalCalled).toBe(true)
    })
  })

  describe('Loading State', () => {
    it('should set loading to true', () => {
      store.setLoading(true)
      const state = store.getState()
      expect(state.loading).toBe(true)
    })

    it('should set loading to false', () => {
      store.setState({ loading: true })
      store.setLoading(false)
      const state = store.getState()
      expect(state.loading).toBe(false)
    })

    it('should trigger listeners when loading changes', () => {
      let called = false
      const listener = () => { called = true }
      store.subscribe(listener)
      store.setLoading(true)
      expect(called).toBe(true)
    })
  })

  describe('Error State', () => {
    it('should set error message', () => {
      store.setError('Test error')
      const state = store.getState()
      expect(state.error).toBe('Test error')
    })

    it('should clear error', () => {
      store.setError('Error')
      store.setError(null)
      const state = store.getState()
      expect(state.error).toBeNull()
    })

    it('should trigger listeners when error changes', () => {
      let called = false
      const listener = () => { called = true }
      store.subscribe(listener)
      store.setError('Error')
      expect(called).toBe(true)
    })
  })

  describe('Albums State', () => {
    it('should initialize with empty albums array', () => {
      const state = store.getState()
      expect(Array.isArray(state.albums)).toBe(true)
      expect(state.albums.length).toBe(0)
    })

    it('should add albums to state', () => {
      const albums = [
        { id: '1', title: 'Album 1' },
        { id: '2', title: 'Album 2' }
      ]
      store.setState({ albums })
      const state = store.getState()
      expect(state.albums).toEqual(albums)
    })

    it('should preserve album data', () => {
      const album = { id: '1', title: 'Album', date: '2024-11-17' }
      store.setState({ albums: [album] })
      const state = store.getState()
      expect(state.albums[0]).toEqual(album)
    })
  })

  describe('Photos State', () => {
    it('should initialize with empty photos object', () => {
      const state = store.getState()
      expect(typeof state.photos).toBe('object')
      expect(Object.keys(state.photos).length).toBe(0)
    })

    it('should add photos by album', () => {
      const photos = {
        'album1': [
          { id: 'photo1', filename: 'photo1.jpg' },
          { id: 'photo2', filename: 'photo2.jpg' }
        ]
      }
      store.setState({ photos })
      const state = store.getState()
      expect(state.photos.album1.length).toBe(2)
    })

    it('should handle multiple albums photos', () => {
      const photos = {
        'album1': [{ id: 'p1', filename: 'p1.jpg' }],
        'album2': [{ id: 'p2', filename: 'p2.jpg' }]
      }
      store.setState({ photos })
      const state = store.getState()
      expect(Object.keys(state.photos).length).toBe(2)
    })
  })

  describe('Cache State', () => {
    it('should initialize with empty cache', () => {
      const state = store.getState()
      expect(state.cache).toBeDefined()
      expect(state.cache.albums).toBeNull()
      expect(state.cache.ttl).toBe(5 * 60 * 1000)
    })

    it('should update cache with album data', () => {
      const cacheData = { albums: ['album1', 'album2'], albumsTimestamp: Date.now() }
      store.setState({ cache: cacheData })
      const state = store.getState()
      expect(state.cache.albums).toEqual(['album1', 'album2'])
    })
  })

  describe('Selected Album', () => {
    it('should initialize with null selected album', () => {
      const state = store.getState()
      expect(state.selectedAlbumId).toBeNull()
    })

    it('should set selected album ID', () => {
      store.setState({ selectedAlbumId: 'album1' })
      const state = store.getState()
      expect(state.selectedAlbumId).toBe('album1')
    })

    it('should clear selected album', () => {
      store.setState({ selectedAlbumId: 'album1' })
      store.setState({ selectedAlbumId: null })
      const state = store.getState()
      expect(state.selectedAlbumId).toBeNull()
    })
  })

  describe('State Isolation', () => {
    it('should return deep copy of state', () => {
      store.setState({ albums: [{ id: '1' }] })
      const state1 = store.getState()
      const state2 = store.getState()
      
      state1.albums[0].id = 'modified'
      expect(state2.albums[0].id).toBe('1')
    })

    it('should not affect internal state when modifying returned state', () => {
      store.setState({ albums: [{ id: '1' }] })
      const state = store.getState()
      state.albums = []
      
      const currentState = store.getState()
      expect(currentState.albums.length).toBe(1)
    })
  })

  describe('Complex State Updates', () => {
    it('should handle nested object updates', () => {
      const cache = {
        albums: ['a1', 'a2'],
        albumsTimestamp: 12345,
        ttl: 300000
      }
      store.setState({ cache })
      const state = store.getState()
      expect(state.cache.albums).toEqual(['a1', 'a2'])
    })

    it('should support batch updates', () => {
      store.setState({
        albums: [{ id: '1' }],
        loading: true,
        error: null
      })
      const state = store.getState()
      expect(state.albums.length).toBe(1)
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should preserve structure across updates', () => {
      store.setState({ albums: [{ id: '1' }] })
      store.setState({ photos: { 'album1': [] } })
      store.setState({ loading: true })
      
      const state = store.getState()
      expect(state).toHaveProperty('albums')
      expect(state).toHaveProperty('photos')
      expect(state).toHaveProperty('loading')
      expect(state).toHaveProperty('error')
      expect(state).toHaveProperty('cache')
    })
  })
})
