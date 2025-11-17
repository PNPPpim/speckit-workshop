# Photo Album Organizer - Implementation Plan

**Feature Branch**: `001-photo-albums`  
**Created**: 2024-11-17  
**Status**: PLAN Phase  
**Planning Agent**: speckit.plan

## Executive Summary

This document defines the implementation plan for Phase 3 (IMPLEMENT) of the Photo Album Organizer, transitioning from the React/TypeScript MVP to a **Vite-based vanilla JavaScript application with SQLite backend storage**.

### Key Changes from Previous MVP
- ❌ Remove: React, TypeScript, npm build complexity
- ✅ Add: Vite for fast development + builds
- ✅ Add: SQLite for persistent metadata storage
- ✅ Add: Local image storage (no cloud uploads)
- ✅ Keep: Same UI/UX and features
- ✅ Minimize: External dependencies

---

## Technology Stack

### Frontend
- **Build Tool**: Vite (ESM-first, fast HMR)
- **Language**: Vanilla JavaScript (ES6+)
- **Markup**: Vanilla HTML5
- **Styling**: Vanilla CSS3 (no preprocessors)
- **No frameworks**: No React, Vue, Svelte required
- **No build complexity**: Simple, direct approach

### Backend/Storage
- **Database**: SQLite (local, file-based)
- **Runtime**: Node.js (for dev + SQLite server)
- **API**: Simple HTTP endpoints (JSON)
- **File Storage**: Local filesystem (no cloud)

### Development
- **Dev Server**: Vite dev server
- **Hot Reload**: HMR for instant feedback
- **Package Manager**: npm
- **Node Version**: 16+

---

## Architecture Overview

### Three-Tier Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Vite + Vanilla JS)       │
│  ├─ HTML/CSS/JavaScript             │
│  ├─ Drag-and-drop handlers          │
│  ├─ UI state management             │
│  └─ Fetch API for server calls      │
└────────────┬────────────────────────┘
             │ HTTP/JSON
┌────────────▼────────────────────────┐
│  Backend (Node.js + SQLite)         │
│  ├─ Express or similar              │
│  ├─ SQLite database                 │
│  ├─ File upload handlers            │
│  └─ Album/photo API endpoints       │
└────────────┬────────────────────────┘
             │ Filesystem
┌────────────▼────────────────────────┐
│  Local Storage                      │
│  ├─ SQLite database file            │
│  ├─ Image files                     │
│  └─ Metadata storage                │
└─────────────────────────────────────┘
```

### File Structure

```
photo-album-organizer/
├── frontend/                          # Vite app
│   ├── index.html                     # Entry point
│   ├── src/
│   │   ├── main.js                    # App initialization
│   │   ├── album-list.js              # Album list component
│   │   ├── album.js                   # Album component
│   │   ├── photo-tile.js              # Photo tile component
│   │   ├── api.js                     # API client
│   │   ├── drag-drop.js               # Drag-and-drop handlers
│   │   ├── db.js                      # Database client
│   │   └── styles/
│   │       ├── main.css               # Global styles
│   │       ├── album-list.css         # Album list
│   │       ├── album.css              # Album
│   │       └── photo-tile.css         # Photo tile
│   ├── vite.config.js                 # Vite configuration
│   └── package.json
│
├── backend/                           # Node.js server
│   ├── server.js                      # Express app
│   ├── db.js                          # SQLite setup & queries
│   ├── handlers/
│   │   ├── albums.js                  # Album endpoints
│   │   ├── photos.js                  # Photo endpoints
│   │   └── uploads.js                 # Image upload handler
│   ├── uploads/                       # Local image storage
│   │   └── (image files here)
│   ├── data.db                        # SQLite database
│   └── package.json
│
└── docs/                              # Documentation
    ├── API.md                         # API endpoints
    ├── DATABASE.md                    # Schema
    └── DEVELOPMENT.md                 # Dev guide
```

---

## Database Schema

### Tables

#### Albums
```sql
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  photo_count INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Photos
```sql
CREATE TABLE photos (
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
);
```

#### Album Order
```sql
CREATE TABLE album_order (
  id INTEGER PRIMARY KEY,
  album_ids TEXT,  -- JSON array as string
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Albums

**GET /api/albums**
- Response: List of all albums with photo counts
- Used by: Initial page load

**GET /api/albums/:id**
- Response: Single album with all photos
- Used by: Album detail view

**PUT /api/albums/:id/order**
- Request: New album order
- Response: Updated albums list
- Used by: Drag-and-drop reorder

**POST /api/albums**
- Request: Album data
- Response: Created album
- Used by: Create new album

**DELETE /api/albums/:id**
- Response: Confirmation
- Used by: Delete album

### Photos

**GET /api/photos/album/:albumId**
- Response: Photos in album
- Used by: Album detail view

**POST /api/photos/upload**
- Request: FormData with file
- Response: Photo metadata
- Used by: Photo upload

**DELETE /api/photos/:id**
- Response: Confirmation
- Used by: Delete photo

**GET /api/photos/:id/thumbnail**
- Response: Image file
- Used by: Photo preview

---

## Implementation Tasks

### Phase 1: Project Setup (T001-T003)

#### T001: Initialize Vite Frontend
- [ ] Create `frontend/` directory
- [ ] Initialize npm project
- [ ] Install Vite and dependencies
- [ ] Create `vite.config.js`
- [ ] Create `index.html` entry point
- [ ] Set up development server configuration
- **Effort**: 1 hour

#### T002: Initialize Node.js Backend
- [ ] Create `backend/` directory
- [ ] Initialize npm project
- [ ] Install Express and SQLite packages
- [ ] Create `server.js` entry point
- [ ] Set up port configuration
- [ ] Create `uploads/` directory
- **Effort**: 1 hour

#### T003: Set Up SQLite Database
- [ ] Create database connection module
- [ ] Create schema initialization script
- [ ] Create tables (Albums, Photos, AlbumOrder)
- [ ] Add seed data option
- [ ] Create database client module
- **Effort**: 1.5 hours

**Subtotal**: 3.5 hours

---

### Phase 2: Backend API (T004-T009)

#### T004: Album Endpoints
- [ ] GET /api/albums (list all)
- [ ] GET /api/albums/:id (single album)
- [ ] POST /api/albums (create)
- [ ] PUT /api/albums/:id (update)
- [ ] DELETE /api/albums/:id (delete)
- [ ] Implement database queries
- **Effort**: 2 hours

#### T005: Photo Endpoints
- [ ] GET /api/photos/album/:albumId (list by album)
- [ ] POST /api/photos/upload (handle upload)
- [ ] DELETE /api/photos/:id (delete photo)
- [ ] Implement file deletion
- [ ] Implement database queries
- **Effort**: 2 hours

#### T006: Album Order Endpoint
- [ ] PUT /api/albums/order (reorder)
- [ ] Update album order_index
- [ ] Update albums table
- [ ] Return updated list
- **Effort**: 1 hour

#### T007: Image Service
- [ ] Image upload handler
- [ ] Generate thumbnail
- [ ] Save to local filesystem
- [ ] Update photo record with dimensions
- [ ] Error handling
- **Effort**: 2 hours

#### T008: Error Handling & Validation
- [ ] Input validation for all endpoints
- [ ] Error response format
- [ ] Logging setup
- [ ] Status codes
- [ ] Edge case handling
- **Effort**: 1.5 hours

#### T009: Testing Backend (Manual)
- [ ] Test all endpoints with curl/Postman
- [ ] Test error cases
- [ ] Test database transactions
- [ ] Performance check
- **Effort**: 1 hour

**Subtotal**: 10.5 hours

---

### Phase 3: Frontend Core (T010-T015)

#### T010: HTML Structure & CSS
- [ ] Create `index.html` with semantic markup
- [ ] Create main layout sections
- [ ] Create `main.css` with layout styles
- [ ] Create responsive grid
- [ ] Mobile-first CSS
- [ ] Component-specific CSS files
- **Effort**: 2 hours

#### T011: Main App Module
- [ ] Create `main.js` entry point
- [ ] Initialize Vite app
- [ ] Set up DOM references
- [ ] Create app state management
- [ ] Set up initialization flow
- **Effort**: 1.5 hours

#### T012: Album List Component
- [ ] Create `album-list.js`
- [ ] Render albums from API
- [ ] Implement list structure
- [ ] Add loading state
- [ ] Add error handling
- **Effort**: 1.5 hours

#### T013: Album Component
- [ ] Create `album.js`
- [ ] Display album details
- [ ] Show photo count
- [ ] Render photo grid
- [ ] Handle album header
- **Effort**: 1 hour

#### T014: Photo Tile Component
- [ ] Create `photo-tile.js`
- [ ] Display photo thumbnail
- [ ] Show photo title
- [ ] Add click handler
- [ ] Implement hover state
- **Effort**: 1 hour

#### T015: API Client Module
- [ ] Create `api.js`
- [ ] Wrap fetch calls
- [ ] Handle responses
- [ ] Error handling
- [ ] Request/response formatting
- **Effort**: 1 hour

**Subtotal**: 8 hours

---

### Phase 4: Drag-and-Drop & Interactions (T016-T020)

#### T016: Drag-and-Drop Module
- [ ] Create `drag-drop.js`
- [ ] Implement dragstart handler
- [ ] Implement dragover handler
- [ ] Implement drop handler
- [ ] Implement dragend handler
- [ ] Add visual feedback
- **Effort**: 2 hours

#### T017: Drag-and-Drop Integration
- [ ] Add drag event listeners to albums
- [ ] Update album order on drop
- [ ] Call API to persist order
- [ ] Update UI after reorder
- [ ] Prevent nesting
- **Effort**: 1.5 hours

#### T018: Photo Upload
- [ ] Create upload form/button
- [ ] Handle file input
- [ ] Send to /api/photos/upload
- [ ] Handle response
- [ ] Update album in UI
- [ ] Error handling
- **Effort**: 1.5 hours

#### T019: Photo Deletion
- [ ] Add delete button to photo tile
- [ ] Implement delete handler
- [ ] Call DELETE /api/photos/:id
- [ ] Remove from UI
- [ ] Update album
- **Effort**: 1 hour

#### T020: Album Management
- [ ] Add album creation interface
- [ ] Add album deletion interface
- [ ] Implement handlers
- [ ] Call appropriate endpoints
- [ ] Update UI state
- **Effort**: 1.5 hours

**Subtotal**: 7.5 hours

---

### Phase 5: State Management (T021-T023)

#### T021: Client-Side State
- [ ] Create state object structure
- [ ] Implement setState function
- [ ] Add state change listeners
- [ ] Create derived state helpers
- [ ] Implement undo/redo capability (optional)
- **Effort**: 1.5 hours

#### T022: State Synchronization
- [ ] Keep UI in sync with state
- [ ] Implement rerender on state change
- [ ] Update only changed elements (DOM diffing)
- [ ] Handle optimistic updates
- **Effort**: 1.5 hours

#### T023: Client-Side Caching
- [ ] Cache albums list in memory
- [ ] Implement cache invalidation
- [ ] Handle cache updates on changes
- [ ] Implement stale-while-revalidate pattern
- **Effort**: 1 hour

**Subtotal**: 4 hours

---

### Phase 6: Data Organization & Formatting (T024-T026)

#### T024: Photo Grouping
- [ ] Implement date grouping logic
- [ ] Create album from grouped photos
- [ ] Handle date formatting
- [ ] Implement sorting algorithm
- **Effort**: 1 hour

#### T025: Album Labeling
- [ ] Format date labels (e.g., "November 17, 2024")
- [ ] Add photo count to label
- [ ] Implement internationalization hook
- [ ] Handle date edge cases
- **Effort**: 1 hour

#### T026: Image Processing
- [ ] Generate thumbnails
- [ ] Store different image sizes
- [ ] Implement responsive images
- [ ] Add loading states
- **Effort**: 1.5 hours

**Subtotal**: 3.5 hours

---

### Phase 7: Performance & Optimization (T027-T030)

#### T027: Lazy Loading
- [ ] Implement image lazy loading
- [ ] Add intersection observer
- [ ] Load images on scroll
- [ ] Implement skeleton loaders
- **Effort**: 1.5 hours

#### T028: Bundle Optimization
- [ ] Configure Vite for optimization
- [ ] Split code into modules
- [ ] Implement dynamic imports
- [ ] Analyze bundle size
- **Effort**: 1 hour

#### T029: Database Optimization
- [ ] Add indexes to tables
- [ ] Optimize queries
- [ ] Implement pagination
- [ ] Add query caching
- **Effort**: 1.5 hours

#### T030: Performance Monitoring
- [ ] Add performance metrics
- [ ] Log load times
- [ ] Monitor database query times
- [ ] Create performance dashboard (optional)
- **Effort**: 1 hour

**Subtotal**: 5 hours

---

### Phase 8: Testing (T031-T035)

#### T031: Backend Unit Tests
- [ ] Set up test framework (Jest)
- [ ] Test database functions
- [ ] Test API endpoint logic
- [ ] Test error handling
- [ ] Aim for 80% coverage
- **Effort**: 2 hours

#### T032: Backend Integration Tests
- [ ] Test API endpoints
- [ ] Test database transactions
- [ ] Test file uploads
- [ ] Test complete workflows
- **Effort**: 2 hours

#### T033: Frontend Unit Tests
- [ ] Set up test framework
- [ ] Test component functions
- [ ] Test state management
- [ ] Test utility functions
- **Effort**: 1.5 hours

#### T034: Frontend Integration Tests
- [ ] Test component interactions
- [ ] Test API calls
- [ ] Test drag-and-drop
- [ ] Test complete user flows
- **Effort**: 1.5 hours

#### T035: End-to-End Tests
- [ ] Set up E2E test runner (Playwright)
- [ ] Test complete user workflows
- [ ] Test across browsers
- [ ] Test error scenarios
- **Effort**: 2 hours

**Subtotal**: 9 hours

---

### Phase 9: Documentation & Polish (T036-T040)

#### T036: API Documentation
- [ ] Write endpoint specifications
- [ ] Document request/response formats
- [ ] Create API examples
- [ ] Document error codes
- [ ] Generate from comments
- **Effort**: 1.5 hours

#### T037: Database Documentation
- [ ] Document schema
- [ ] Document relationships
- [ ] Provide query examples
- [ ] Document migrations
- **Effort**: 1 hour

#### T038: Frontend Documentation
- [ ] Document component APIs
- [ ] Create component hierarchy
- [ ] Document state structure
- [ ] Provide usage examples
- **Effort**: 1 hour

#### T039: Developer Guide
- [ ] Setup instructions
- [ ] Development workflow
- [ ] Build/deploy instructions
- [ ] Troubleshooting guide
- **Effort**: 1.5 hours

#### T040: Code Quality
- [ ] Add ESLint configuration
- [ ] Add Prettier configuration
- [ ] Set up pre-commit hooks
- [ ] Document code standards
- **Effort**: 1 hour

**Subtotal**: 6 hours

---

### Phase 10: Quality Assurance (T041-T044)

#### T041: Manual Testing
- [ ] Test all FR requirements
- [ ] Test all user stories
- [ ] Test edge cases
- [ ] Test performance
- [ ] Create test report
- **Effort**: 3 hours

#### T042: Cross-Browser Testing
- [ ] Test Chrome
- [ ] Test Firefox
- [ ] Test Safari
- [ ] Test Edge
- [ ] Document compatibility
- **Effort**: 2 hours

#### T043: Performance Testing
- [ ] Load test (1000+ albums)
- [ ] Database query performance
- [ ] Network performance
- [ ] Memory usage
- [ ] Create performance report
- **Effort**: 2 hours

#### T044: Security Testing
- [ ] Validate all inputs
- [ ] Test for SQL injection
- [ ] Test file upload security
- [ ] Check CORS configuration
- [ ] Document security measures
- **Effort**: 1.5 hours

**Subtotal**: 8.5 hours

---

### Phase 11: Deployment & DevOps (T045-T047)

#### T045: Build Pipeline
- [ ] Create build script
- [ ] Optimize frontend build
- [ ] Optimize backend build
- [ ] Create distribution packages
- **Effort**: 1 hour

#### T046: Deployment Configuration
- [ ] Create deployment guide
- [ ] Environment configuration
- [ ] Database migration scripts
- [ ] Backup procedures
- **Effort**: 1 hour

#### T047: Monitoring & Logging
- [ ] Add structured logging
- [ ] Set up error tracking
- [ ] Monitor performance metrics
- [ ] Create dashboard
- **Effort**: 1.5 hours

**Subtotal**: 3.5 hours

---

## Task Sequencing

### Critical Path Analysis

**Tier 1 (Must Complete First)**
1. T001: Initialize Vite Frontend
2. T002: Initialize Node.js Backend
3. T003: Set Up SQLite Database

**Tier 2 (Backend Core)**
4. T004: Album Endpoints
5. T005: Photo Endpoints
6. T006: Album Order Endpoint
7. T007: Image Service
8. T008: Error Handling & Validation

**Tier 3 (Frontend Core)**
9. T010: HTML Structure & CSS
10. T011: Main App Module
11. T012: Album List Component
12. T013: Album Component
13. T014: Photo Tile Component
14. T015: API Client Module

**Tier 4 (Integration)**
15. T016: Drag-and-Drop Module
16. T017: Drag-and-Drop Integration
17. T018: Photo Upload
18. T019: Photo Deletion
19. T020: Album Management

**Tier 5 (Enhancements)**
20. T021: Client-Side State
21. T022: State Synchronization
22. T023: Client-Side Caching
23. T024: Photo Grouping
24. T025: Album Labeling
25. T026: Image Processing

**Tier 6 (Optimization)**
26. T027: Lazy Loading
27. T028: Bundle Optimization
28. T029: Database Optimization
29. T030: Performance Monitoring

**Tier 7 (Quality)**
30. T031-T035: Testing (5 tasks)
31. T041-T044: QA (4 tasks)

**Tier 8 (Documentation & Deployment)**
32. T036-T040: Documentation (5 tasks)
33. T045-T047: DevOps (3 tasks)

### Parallelizable Tasks

- T001 and T002 (frontend and backend setup)
- T004-T007 (different API endpoints)
- T010-T015 (frontend components can be parallel)
- T031-T034 (different test layers)

---

## Effort Estimation

### Summary by Phase

| Phase | Tasks | Hours | Days |
|-------|-------|-------|------|
| Setup | T001-T003 | 3.5 | 0.5 |
| Backend API | T004-T009 | 10.5 | 1.5 |
| Frontend Core | T010-T015 | 8 | 1 |
| Interactions | T016-T020 | 7.5 | 1 |
| State Mgmt | T021-T023 | 4 | 0.5 |
| Data Org | T024-T026 | 3.5 | 0.5 |
| Optimization | T027-T030 | 5 | 0.75 |
| Testing | T031-T035 | 9 | 1.25 |
| Docs & Polish | T036-T040 | 6 | 1 |
| QA | T041-T044 | 8.5 | 1.25 |
| DevOps | T045-T047 | 3.5 | 0.5 |

**TOTAL**: 47 tasks, 69 hours, ~8.5 days (1 dev, 1 week with breaks)

---

## Technical Decisions

### Why Vite?
- Fast cold start (~300ms)
- Instant HMR on changes
- ESM-native (no heavy bundling)
- Minimal configuration needed
- Production optimization built-in
- Smaller learning curve than webpack

### Why Vanilla JavaScript?
- No framework overhead
- Direct DOM manipulation
- Smaller bundle size
- Easier debugging
- No build complexity
- Full control over functionality

### Why SQLite?
- No server setup required
- Single file database
- ACID compliance
- Sufficient for local storage
- Easy to backup
- Good for 1000+ albums

### Why Local Storage?
- No cloud costs
- Maximum privacy
- Instant access
- No bandwidth limits
- Simple implementation
- User has full control

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Vite build issues | Low | Medium | Use well-documented features only |
| SQLite corruption | Very Low | High | Implement regular backups |
| File storage limits | Low | Medium | Implement storage monitoring |
| Performance at scale | Medium | Medium | Optimize queries and lazy load |
| Browser compatibility | Low | Medium | Test on target browsers early |

### Mitigation Strategies

1. **Vite Issues**: Stick to basic Vite features, avoid experimental APIs
2. **Database Integrity**: Add database validation and recovery procedures
3. **File Storage**: Implement storage size monitoring and cleanup
4. **Performance**: Start performance testing by T027
5. **Compatibility**: Test early and often (start T042 after T015)

---

## Dependencies & Libraries

### Frontend
```json
{
  "dependencies": {},
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "sqlite3": "^5.1.0",
    "multer": "^1.4.0",
    "sharp": "^0.32.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.3.0"
  }
}
```

**Total External Dependencies**: Minimal (4 main, 2 dev)

---

## Success Criteria

### Must Have (MVP)
- ✅ All 12 FR requirements implemented
- ✅ All 5 user stories working
- ✅ 80% test coverage
- ✅ Performance targets met
- ✅ Documentation complete

### Should Have
- ✅ Cross-browser testing passed
- ✅ Performance optimized
- ✅ Code review completed
- ✅ Security audit passed

### Nice to Have
- Photo search and filtering
- Album sharing
- Advanced image editing
- Cloud backup option

---

## Assumptions

1. **Development Environment**: Developer has Node.js 16+ installed
2. **File Storage**: 10GB storage available on local disk
3. **Single User**: Application runs in single-user mode (no multi-user sync)
4. **Browser Support**: Target modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
5. **Image Size**: Photos typically < 10MB each
6. **Album Count**: System designed for 1000+ albums

---

## Next Steps

1. **Approve Plan**: Review and approve this plan
2. **Create Tasks**: Break into sprint-sized chunks
3. **Start Development**: Begin Phase 1 (Setup)
4. **Daily Standup**: Track progress
5. **Weekly Review**: Adjust plan as needed

---

**Plan Created**: 2024-11-17  
**Status**: Ready for IMPLEMENT Phase  
**Next Phase**: Implementation (47 tasks, 69 hours)

See `/tasks.md` for detailed task breakdown.
