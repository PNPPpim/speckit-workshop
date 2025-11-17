# Phase 3 Implementation Plan: Testing Suite

**Status**: 🟡 **IN PROGRESS**  
**Phase**: Testing & Quality Assurance  
**Tasks**: T030-T034 (5 tasks, 9 hours)  
**Target**: Production-ready test coverage

---

## Overview

Phase 3 focuses on comprehensive test coverage across backend and frontend, ensuring code quality and reliability before production deployment.

### Tasks

| Task | Title | Type | Effort | Status |
|------|-------|------|--------|--------|
| T030 | Backend Unit Tests | QA | 2h | ⏳ |
| T031 | Backend Integration Tests | QA | 2h | ⏳ |
| T032 | Frontend Unit Tests | QA | 1.5h | ⏳ |
| T033 | Frontend Integration Tests | QA | 1.5h | ⏳ |
| T034 | End-to-End Tests | QA | 2h | ⏳ |

---

## Task Details

### T030: Backend Unit Tests (2 hours)

**Scope**: Database, routes, utilities, error handling  
**Target**: 80% coverage  
**Tools**: Jest

**Files to test**:
```
backend/
├── db.js                    # Database functions
├── server.js                # Setup, middleware
├── handlers/
│   ├── albums.js            # Album CRUD
│   └── photos.js            # Photo CRUD
├── validation.js            # Input validation
└── metrics.js               # Performance tracking
```

**Test Cases** (~30-40 tests):
- Database initialization
- Album CRUD operations
- Photo CRUD operations
- Album reordering
- Cascading deletes
- Input validation
- Error scenarios
- Metrics recording

**Setup**:
```bash
npm install --save-dev jest supertest
```

---

### T031: Backend Integration Tests (2 hours)

**Scope**: API endpoints, database transactions, file operations  
**Tools**: Jest + Supertest

**Test Endpoints**:
- `GET /api/albums` - List albums
- `POST /api/albums` - Create album
- `PUT /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album
- `POST /api/albums/reorder` - Reorder albums
- `GET /api/photos/album/:albumId` - List photos
- `POST /api/photos` - Upload photo
- `DELETE /api/photos/:id` - Delete photo
- `GET /api/health` - Health check
- `GET /api/metrics` - Get metrics

**Test Scenarios** (~20-30 tests):
- Valid requests
- Invalid input
- Missing fields
- Duplicate albums
- File upload edge cases
- Cascading delete transactions
- Error responses
- Status codes

---

### T032: Frontend Unit Tests (1.5 hours)

**Scope**: Components, state, handlers, utilities  
**Tools**: Jest + DOM Testing Library

**Modules to test**:
```
frontend/src/
├── store.js                 # State management
├── cache.js                 # Caching logic
├── data-service.js          # Date grouping, formatting
├── lazy-load.js             # Lazy loading
├── api.js                   # API calls
├── album-list.js            # Album component
├── album.js                 # Album view
├── photo-tile.js            # Photo tile
└── drag-drop.js             # Drag and drop
```

**Test Cases** (~25-35 tests):
- State store getState/setState
- Cache set/get/invalidate
- Date grouping logic
- Date formatting (locale, timezone)
- API call construction
- Lazy loading initialization
- Component rendering
- Event handler binding

---

### T033: Frontend Integration Tests (1.5 hours)

**Scope**: Component interactions, API calls, workflows  
**Tools**: Jest + DOM Testing Library

**Workflows to test** (~15-20 tests):
- Album creation
- Photo upload to album
- Album reordering (drag-drop)
- Album deletion
- Photo deletion
- Cache invalidation on mutations
- State synchronization
- Error handling and recovery

---

### T034: End-to-End Tests (2 hours)

**Scope**: Complete workflows, browser compatibility, mobile  
**Tools**: Playwright

**Test Scenarios** (~10-15 tests):
- Complete upload workflow
- Album management (CRUD)
- Photo management (CRUD)
- Drag-and-drop reordering
- Lazy loading of images
- Error scenarios
- Mobile viewport
- Desktop viewport
- Network failures

**Browsers to test**:
- Chrome/Chromium
- Firefox
- Webkit (Safari)
- Mobile (iPhone, Android)

---

## Implementation Roadmap

### Phase 3.1: Backend Testing (T030-T031) - 4 hours
1. Set up Jest + Supertest
2. Create test utilities and fixtures
3. Write unit tests for db.js, validation.js
4. Write unit tests for handlers
5. Write integration tests for API endpoints
6. Achieve 80% coverage

### Phase 3.2: Frontend Testing (T032-T033) - 3 hours
1. Set up Jest + DOM Testing Library
2. Write tests for store.js (state management)
3. Write tests for cache.js
4. Write tests for data-service.js, lazy-load.js
5. Write component unit tests
6. Write integration tests for workflows

### Phase 3.3: End-to-End Testing (T034) - 2 hours
1. Set up Playwright
2. Write complete workflow tests
3. Test browser compatibility
4. Test mobile viewports
5. Generate coverage report

---

## Test Configuration Files

### Backend: `backend/jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Frontend: `frontend/jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js'
  ]
}
```

### E2E: `frontend/playwright.config.js`
```javascript
module.exports = {
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI
  }
}
```

---

## Dependencies to Install

```bash
# Backend testing
npm install --save-dev jest supertest

# Frontend testing
npm install --save-dev jest @testing-library/dom identity-obj-proxy

# E2E testing
npm install --save-dev @playwright/test
```

---

## Coverage Goals

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| Backend handlers | 0% | 80% | ⏳ |
| Backend db.js | 0% | 80% | ⏳ |
| Frontend store | 0% | 85% | ⏳ |
| Frontend cache | 0% | 85% | ⏳ |
| Frontend services | 0% | 80% | ⏳ |
| Integration tests | 0% | 100% of workflows | ⏳ |
| E2E tests | 0% | 100% of user stories | ⏳ |

---

## Success Criteria

✅ **T030-T031 Complete**:
- [x] Jest setup with npm scripts
- [x] 30+ backend unit tests
- [x] 20+ backend integration tests
- [x] 80% code coverage achieved
- [x] All tests passing

✅ **T032-T033 Complete**:
- [x] Jest + DOM Testing Library setup
- [x] 25+ frontend unit tests
- [x] 15+ frontend integration tests
- [x] 85% state management coverage
- [x] All tests passing

✅ **T034 Complete**:
- [x] Playwright setup
- [x] 10+ E2E tests
- [x] Browser compatibility verified
- [x] Mobile viewport tested
- [x] All tests passing

---

## Timeline

- **Session 1**: T030-T031 (backend testing) - 4 hours
- **Session 2**: T032-T033 (frontend testing) - 3 hours
- **Session 3**: T034 (E2E testing) - 2 hours

**Total**: ~9 hours (Phase 3 effort)

---

## Next Phase

**Phase 4: Quality Assurance (T035-T038)**
- Manual testing checklist
- Cross-browser testing
- Performance testing (load, stress)
- Security testing

---

**Status**: 🟡 **READY TO BEGIN**

Next action: Start with T030 backend unit tests setup.
