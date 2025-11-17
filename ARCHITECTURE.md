# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser / DOM                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Application                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    App.tsx                               │  │
│  │  • State management (albums array)                       │  │
│  │  • Initialization logic                                  │  │
│  │  • Main orchestration                                    │  │
│  └───────────┬──────────────────────────┬──────────────────┘  │
│              │                          │                      │
│              ▼                          ▼                      │
│  ┌──────────────────────┐    ┌─────────────────────────────┐  │
│  │  AlbumList           │    │  Service Layer              │  │
│  │  Component           │    │  ├─ dataService            │  │
│  │  • Drag-drop logic   │    │  │  • groupPhotosByDate()   │  │
│  │  • Album rendering   │    │  │  • formatDateLabel()     │  │
│  │  • Visual feedback   │    │  │  • addPhotosToAlbums()   │  │
│  └──────────┬───────────┘    │  └─ storageService         │  │
│             │                 │     • loadAppState()       │  │
│             │                 │     • saveAppState()       │  │
│             │                 │     • clearAppState()      │  │
│             │                 │     • getStorageInfo()     │  │
│             │                 └─────────────────────────────┘  │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Album Component (for each album)                │  │
│  │  • Album title (formatted date)                          │  │
│  │  • Photo count                                           │  │
│  │  • Grid container                                        │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                             │
│                   ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   PhotoTile Component (for each photo)                   │  │
│  │  • Image rendering                                       │  │
│  │  • Lazy loading                                          │  │
│  │  • Photo title                                           │  │
│  │  • Error handling                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Browser APIs                                 │
├─────────────────────────────────────────────────────────────────┤
│  • localStorage (persistence)                                   │
│  • Drag & Drop API (reordering)                                 │
│  • Image API (lazy loading)                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Initialization Flow

```
App Mount
  │
  ├─→ Try load from localStorage
  │    ├─ Success: Set albums state
  │    └─ Fail: Generate mock data
  │
  ├─→ Generate mock photos (if needed)
  │    └─ dataService.generateMockPhotos(50)
  │
  ├─→ Group photos by date
  │    └─ dataService.groupPhotosByDate()
  │
  ├─→ Set component state
  │    └─ setAlbums(initialAlbums)
  │
  └─→ Render UI
      └─ AlbumList renders albums + components
```

### User Interaction Flow: Reordering

```
User drags album
  │
  ├─→ onDragStart (store dragged index)
  │
  ├─→ onDragOver (show drop target visual feedback)
  │
  ├─→ User releases (drops on new position)
  │
  ├─→ onDrop handler executes:
  │    ├─ Validate drop is valid (not self)
  │    ├─ Create new albums array
  │    ├─ Remove from old position
  │    ├─ Insert at new position
  │    └─ Call onReorder callback
  │
  ├─→ App.handleReorder:
  │    ├─ Update order indexes
  │    ├─ Set state (re-render)
  │    └─ Call saveAppState()
  │
  ├─→ storageService.saveAppState():
  │    ├─ Serialize albums to JSON
  │    └─ Save to localStorage
  │
  └─→ UI updates with new album order
      └─ Change persisted (refreshing page maintains order)
```

## Component Hierarchy

```
<App>
  │
  └─ <AlbumList>
      │
      └─ {albums.map(album =>
          <div className="albumWrapper">
            <Album album={album} />
          </div>
        )}
          │
          └─ <Album>
              │
              └─ {album.photos.map(photo =>
                  <PhotoTile photo={photo} />
                )}
                │
                └─ <PhotoTile>
                    ├─ <img> (lazy loaded)
                    └─ <p> (title)
```

## State Management

### Single Source of Truth: App.tsx State

```typescript
interface State {
  albums: Album[]          // All albums with photos
  isLoading: boolean       // Initial load indicator
}

// State updates:
// 1. Initial load: loadAppState() or generate mock
// 2. After drag-drop: reorder and save to localStorage
// 3. Persistence: localStorage syncs with state
```

### Data Structure

```typescript
Album
  ├─ id: string
  ├─ date: Date
  ├─ title: string
  ├─ order: number
  └─ photos: Photo[]
       │
       └─ Photo
            ├─ id: string
            ├─ url: string
            ├─ title: string
            └─ dateAdded: Date

AppState
  └─ albums: Album[]
```

## Key Design Patterns

### 1. **Service Layer Pattern**

**Location**: `src/services/`

```
Components  →  Services  →  Browser APIs
(UI Logic) → (Business Logic) → (Platform APIs)
```

- Components handle rendering and user events
- Services encapsulate business logic
- Clean separation of concerns

### 2. **Container/Presentational Pattern**

**Location**: `src/components/`

- **App.tsx** - Container (state, side effects)
- **AlbumList.tsx** - Container (drag-drop logic)
- **Album.tsx** - Presentational (just renders)
- **PhotoTile.tsx** - Presentational (just renders)

### 3. **Lazy Loading Pattern**

**Location**: `PhotoTile.tsx`, `PhotoTile.module.css`

```html
<img loading="lazy" />
```

- Images load only when visible in viewport
- Reduces initial load and memory usage

### 4. **Persistence Pattern**

**Location**: `storageService.ts`

```
State Change  →  Save to localStorage  ↓
     ↑                                 │
     └──────  Reload  ←  Load from localStorage
```

- Automatic persistence on state change
- Automatic restoration on app load
- Centralized in single service

## Performance Optimizations

### 1. **CSS Grid (Efficient Layout)**
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
```
- No JavaScript layout calculations
- Responsive without media queries
- Efficient for many items

### 2. **Lazy Image Loading**
```html
<img loading="lazy" src={url} />
```
- Images only load when needed
- Reduces initial bandwidth
- Improves time-to-interactive

### 3. **React Optimization**
- Functional components with hooks
- Proper dependency arrays
- No unnecessary re-renders
- CSS Modules for scoped styles

### 4. **Data Structure**
- Flat album array (O(n) operations)
- No redundant data copies
- Direct state mutations prevented
- Immutable updates (spread operator)

## Error Handling Strategy

### Storage Errors
```
saveAppState() error  →  Log to console
                    →  App still functional
                    →  Changes persist in memory
```

### Image Loading Errors
```
Image load fails  →  onError handler
              →  Show fallback SVG
              →  App continues normally
```

### JSON Parsing Errors
```
loadAppState() parse fails  →  Try-catch
                        →  Return null
                        →  App loads with mock data
```

## Scalability Considerations

### For 1000+ Albums
- ✅ Flat array structure (O(1) access)
- ✅ Lazy loading images (memory efficient)
- ✅ Virtual scrolling ready (future)
- ⚠️ localStorage limit ~5MB (monitor size)

### For 10,000+ Photos
- ✅ Lazy loading required (implemented)
- ✅ Pagination or virtual scrolling (ready)
- ✅ Efficient grid rendering
- ⚠️ Consider backend pagination API

### For Future Growth
- Add server-side storage (backend API)
- Implement image CDN
- Add search/filtering
- Add pagination
- Consider React.memo for optimization

## Security Considerations

### localStorage
- ✅ No sensitive data stored
- ✅ Data is user's own photos
- ⚠️ Vulnerable to XSS in untrusted environment

### Image URLs
- ✅ Uses external CDN (picsum.photos)
- ✅ Image URLs are public
- ⚠️ User would provide URLs in production

### Type Safety
- ✅ Full TypeScript strict mode
- ✅ All data validated at entry points
- ✅ No unsafe casts

## Testing Strategy

### Unit Tests
- `dataService.ts` - Grouping, formatting
- `storageService.ts` - Save/load
- Component logic in isolation

### Integration Tests
- App → AlbumList → Album → PhotoTile
- Drag-drop complete flow
- Storage persistence flow

### E2E Tests
- Full user workflows
- Browser compatibility
- Performance benchmarks

## Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Mobile |
|---------|--------|---------|--------|--------|
| React 18 | ✅ | ✅ | ✅ | ✅ |
| TypeScript | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Drag & Drop | ✅ | ✅ | ✅ | ⚠️* |
| localStorage | ✅ | ✅ | ✅ | ✅ |
| Lazy Loading | ✅ | ✅ | ✅ | ✅ |

*Mobile: Requires touch event polyfill or alternative

---

**Last Updated**: 2024-11-17
