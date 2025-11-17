# Quick Start Guide - Photo Album Organizer

## Overview

This is a Photo Album Organizer built with **Vite + Vanilla JavaScript + SQLite**. It helps you organize photos into albums grouped by date, with drag-and-drop reordering and local database storage.

## Prerequisites

- Node.js 16+
- npm 8+
- ~500MB disk space

## Quick Start (2 Commands!)

### Terminal 1: Start Backend
```bash
cd backend
npm install
npm run dev
```
**Backend running**: http://localhost:3000

### Terminal 2: Start Frontend
```bash
cd frontend
npm install
npm run dev
```
**Frontend running**: http://localhost:5173

Open http://localhost:5173 in your browser - that's it!

## Features

- 📅 Albums grouped by date
- 🔀 Drag-and-drop reordering
- 📸 Upload photos
- 💾 Local SQLite database
- 📱 Mobile responsive
- ⚡ Fast with Vite

## Using the App

1. **Upload Photos**: Click "Upload Photos" button
2. **Select Files**: Choose image files (JPG, PNG, GIF, WebP)
3. **View Albums**: Photos automatically grouped by date
4. **Reorder**: Drag albums to new positions
5. **Manage**: Click 📸 to add photos or 🗑️ to delete

## Development

### Frontend
- Location: `frontend/`
- Framework: Vite (build tool)
- Language: Vanilla JavaScript ES6+
- Styling: CSS3 (mobile-first)

### Backend
- Location: `backend/`
- Framework: Express.js
- Database: SQLite
- Storage: Local filesystem

### Production Build

Frontend:
```bash
cd frontend
npm run build
```
Output: `frontend/dist/`

Backend: Ready to run as-is

## Code Quality

### Linting

Check code for style and quality issues:
```bash
npm run lint
```

Auto-fix fixable issues:
```bash
npm run lint:fix
```

### TypeScript

The project uses strict TypeScript mode. Type errors will be caught during:
- Development (`npm start`)
- Build (`npm run build`)
- Linting (`npm run lint`)

## Project Structure

```
src/
├── App.tsx                 # Main app component
├── App.css                 # App styles
├── index.tsx               # React entry point
├── index.css               # Global styles
├── types.ts                # TypeScript interfaces
│
├── components/
│   ├── AlbumList.tsx       # Album list with drag-drop
│   ├── AlbumList.module.css
│   ├── Album.tsx           # Album display
│   ├── Album.module.css
│   ├── PhotoTile.tsx       # Individual photo tile
│   └── PhotoTile.module.css
│
└── services/
    ├── dataService.ts      # Photo grouping logic
    └── storageService.ts   # localStorage persistence

public/
└── index.html              # HTML template
```

## How to Use the App

### 1. View Albums

When you start the app, you'll see albums organized by date:
- Each album shows the date as its title (e.g., "November 17, 2024")
- Photo count is displayed in the album header
- Albums are displayed in chronological order (oldest first)

### 2. Browse Photos

Each album displays photos in a responsive grid:
- Photos are shown as tiles with preview images
- Photo titles are displayed under each image
- Hover over a photo to see it enlarged slightly
- Images load lazily as they become visible

### 3. Reorder Albums

Drag and drop to reorder albums:
1. Hover over an album to see the cursor change to "move"
2. Click and drag an album to a new position
3. The drop target highlights in blue
4. Release to drop the album in its new position
5. The new order is automatically saved

### 4. Data Persistence

Your album order is automatically saved:
- Saved to browser localStorage
- Persists across page refreshes
- Persists across browser sessions
- No manual save button needed

## Features

✅ **Automatic Date Grouping** - Photos grouped by calendar date
✅ **Drag-and-Drop** - Reorder albums with visual feedback
✅ **Persistent Storage** - Order saved to localStorage
✅ **Responsive Grid** - Photos display in adaptive tile layout
✅ **Lazy Loading** - Images load efficiently
✅ **Flat Structure** - No nested albums
✅ **Accessibility** - Keyboard navigation and ARIA labels

## Sample Data

The app starts with 50 sample photos distributed across multiple dates:
- Photos are created from November 1-30, 2024
- Each date creates a separate album
- Use this to test drag-and-drop functionality

To start fresh:
- Open browser DevTools (F12)
- Go to Application → LocalStorage
- Find `photoAlbumAppState`
- Delete it and refresh the page

## Keyboard Shortcuts

- `Tab` - Navigate between album and photos
- `Enter` - Activate photo
- ESC - Close any focused element

## Troubleshooting

### Port Already in Use

If `localhost:3000` is already in use, npm will prompt you to use a different port:
```
Would you like to run the app on another port instead? (Y/n)
```

Press `Y` to accept.

### Dependencies Not Installing

If npm install fails:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock file
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install
```

### localStorage Not Working

In some browsers (private mode, development), localStorage might be disabled:
- The app will still work, but changes won't persist across page refreshes
- Check browser console for warnings

### Images Not Loading

If external image URLs fail to load:
- The app shows a placeholder SVG instead
- In production, you would provide your own image URLs

## Development Tips

### Editing Components

Components are in `src/components/`:
- Save changes → automatically hot-reloaded in browser
- CSS changes appear instantly
- Component errors shown in error overlay

### Editing Services

Services are in `src/services/`:
- `dataService.ts` - Photo grouping and organization logic
- `storageService.ts` - localStorage operations
- Changes trigger automatic reload

### Adding New Features

1. Create component in `src/components/`
2. Create service in `src/services/` if needed
3. Update types in `src/types.ts`
4. Import in `src/App.tsx` or other components
5. Styles in `ComponentName.module.css`

### Type Safety

Keep TypeScript strict mode enabled:
- Hover over variables to see inferred types
- Use interfaces for all data structures
- Type component props with interfaces

## Environment Variables

None required for development. For production:
- Set `NODE_ENV=production` for optimized build
- All configuration is built-in

## Performance

The app is optimized for:
- **Large libraries**: Handles 1000+ albums
- **Many photos**: Lazy loading prevents performance issues
- **Smooth dragging**: Efficient event handling
- **Low memory**: Minimal data structure overhead

## Browser Support

✅ Chrome/Edge 88+
✅ Firefox 78+
✅ Safari 14+
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Documentation

- `IMPLEMENTATION_GUIDE.md` - Detailed requirement mapping
- `BUILD_SUMMARY.md` - Build overview and statistics
- `specs/001-photo-albums/spec.md` - Full specification

## Next Steps

### To Enhance the App

1. **Photo Upload** - Add file picker to import photos
2. **Search** - Filter photos by title or date
3. **Deletion** - Add button to remove photos
4. **Export** - Download albums as ZIP
5. **Tags** - Organize with custom tags

### To Deploy

1. Run `npm build`
2. Upload `build/` directory to hosting service:
   - Vercel, Netlify, GitHub Pages
   - AWS S3 + CloudFront
   - Your own server

### To Test

1. Create test files in `src/__tests__/`
2. Run `npm test` to start test runner
3. Aim for 80% code coverage

## Getting Help

Check the specification and documentation files:
- Questions about features? → See `specs/001-photo-albums/spec.md`
- Questions about code? → See `IMPLEMENTATION_GUIDE.md`
- Questions about build? → See `BUILD_SUMMARY.md`

## Support

For issues or questions:
1. Check browser console (F12) for error messages
2. Review localStorage state (DevTools → Application)
3. Test in incognito/private mode to isolate issues
4. Check that dependencies installed correctly (`npm list react`)

---

**Happy organizing!** 🎞️📸
