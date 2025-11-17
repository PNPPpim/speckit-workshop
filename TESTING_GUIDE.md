# Testing Guide - Photo Album Organizer

## Overview

This guide explains how to test the Photo Album Organizer MVP implementation to verify all functional requirements are met.

---

## Setup for Testing

### Prerequisites
- Node.js 16+
- npm 7+
- Modern browser (Chrome, Firefox, Safari, or Edge)

### Installation

```bash
# Navigate to project directory
cd /Users/pnpp/Desktop/speckit-workshop

# Install dependencies
npm install

# Start development server
npm start
```

The app will open automatically at `http://localhost:3000`

---

## Functional Requirement Testing

### FR-001: Display Photo Albums Organized by Date

**Test Steps**:
1. Launch app (`npm start`)
2. Observe the main page
3. Look for album containers

**Verification Checklist**:
- [ ] Multiple albums are visible
- [ ] Each album has a title showing a date (e.g., "November 17, 2024")
- [ ] Albums are displayed in chronological order (oldest first)
- [ ] Photo count is displayed in each album header
- [ ] Each album shows "X photos" (e.g., "5 photos")

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Albums sorted by date, titles show dates, count displayed
Actual: __________________________
```

---

### FR-002: Support Drag-and-Drop Reordering

**Test Steps**:
1. Look at current album order (note positions)
2. Hover over an album
3. Click and drag album to new position
4. Release mouse to drop

**Verification Checklist**:
- [ ] Cursor changes to "move" when hovering over album
- [ ] Album becomes semi-transparent (50% opacity) while dragging
- [ ] Drop target highlights in blue
- [ ] Album moves to new position when dropped
- [ ] Album can be dragged to multiple positions
- [ ] Can drag albums up and down
- [ ] Dragging doesn't break the UI

**Test Scenarios**:
```
Scenario A: Drag album from position 1 to position 3
  1. Drag album 1
  2. Drop over album 3
  3. Verify: Album 1 is now after original album 3

Scenario B: Drag album from position 3 back to position 1
  1. Drag album 3
  2. Drop over album 1
  3. Verify: Album 3 is now before original album 1
```

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Smooth drag-drop with visual feedback
Actual: __________________________
```

---

### FR-003: Persist Album Order Changes

**Test Steps**:
1. Note current album order
2. Reorder albums using drag-drop
3. Refresh the page (press F5)
4. Check if order is maintained

**Verification Checklist**:
- [ ] New album order is saved after drop
- [ ] Order persists after page refresh
- [ ] Order persists after browser restart
- [ ] Order persists even if user closes and reopens tab
- [ ] Data saved to localStorage (check DevTools)

**Testing localStorage Directly**:
```javascript
// Open browser console (F12) and type:
localStorage.getItem('photoAlbumAppState')

// Should return JSON containing albums in new order
```

**Clear and Restart**:
```javascript
// Clear storage and restart
localStorage.removeItem('photoAlbumAppState')
// Refresh page
// Should restart with default sample data
```

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Order maintained across refreshes/restarts
Actual: __________________________
```

---

### FR-004: Prevent Album Nesting

**Test Steps**:
1. Attempt to drag album A onto album B (not beside, but directly on top)
2. Try to "drop" it as if creating nested structure
3. Observe behavior

**Verification Checklist**:
- [ ] Cannot drag album onto another album (drop target doesn't highlight)
- [ ] If dropped on album, nothing changes
- [ ] Album returns to original position if dropped on invalid target
- [ ] UI layout shows flat list (no indentation)
- [ ] No visual indication of nesting is possible

**Data Structure Verification**:
```javascript
// In console, check if albums can have parent references
const state = JSON.parse(localStorage.getItem('photoAlbumAppState'))
state.albums.forEach(album => {
  if (album.parentId) console.log('ERROR: Album has parent!')
})
// Should have no output if no nesting
```

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Drop rejected, albums stay flat
Actual: __________________________
```

---

### FR-005: Display Photos in Tile-Based Grid

**Test Steps**:
1. Look at any album
2. Observe photo layout
3. Scroll to see more albums with more photos
4. Resize browser window

**Verification Checklist**:
- [ ] Photos display in tile grid format
- [ ] Each tile shows a photo image
- [ ] Photo title appears under each image
- [ ] Tiles are arranged in a responsive grid
- [ ] Grid adapts when window is resized
- [ ] On narrow screen: fewer columns
- [ ] On wide screen: more columns
- [ ] All tiles are the same size

**Grid Responsiveness Test**:
```
Window Width  →  Expected Columns
1200px        →  ~6 columns
800px         →  ~4 columns
600px         →  ~3 columns
400px         →  ~2 columns
```

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Responsive grid layout, consistent tile sizing
Actual: __________________________
```

---

### FR-006: Automatically Group Photos by Date

**Test Steps**:
1. Check each album title
2. Look at which photos are in each album
3. Verify photos in same album are from same date

**Verification Checklist**:
- [ ] Albums are created by date
- [ ] Each album contains only photos from one date
- [ ] Photos from same date are in same album
- [ ] Photos from different dates are in different albums
- [ ] Grouping is consistent

**Verify Grouping**:
```javascript
// In console, verify grouping logic
const state = JSON.parse(localStorage.getItem('photoAlbumAppState'))
state.albums.forEach(album => {
  const dates = album.photos.map(p => p.dateAdded.split('T')[0])
  const unique = new Set(dates)
  console.log(`Album ${album.title}: ${unique.size} unique date(s)`)
  // Should show 1 unique date per album
})
```

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Photos grouped by date, 1 date per album
Actual: __________________________
```

---

### FR-007: Clearly Label Albums with Date

**Test Steps**:
1. Look at each album title
2. Note the format of date displayed
3. Verify it's human-readable

**Verification Checklist**:
- [ ] Album title shows full date (e.g., "November 17, 2024")
- [ ] Date format is consistent across all albums
- [ ] Date is easy to read (not abbreviated or confusing)
- [ ] Month name is spelled out (not numeric)
- [ ] Year is included
- [ ] Photo count is displayed (e.g., "5 photos")

**Expected Date Formats**: ✅
- "November 17, 2024" ✅
- "2024-11-17" ❌ (Not human-readable enough)
- "11/17/24" ❌ (Ambiguous)

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Date format like "November 17, 2024"
Actual: __________________________
```

---

### FR-008: Handle Missing/Invalid Date Metadata

**Status**: ⚠️ **Deferred for MVP**

**Note**: Current MVP always has valid dates. In production:

**Test for Future**:
1. Add photo with missing date metadata
2. Should appear in "Undated" album
3. Should not break the app

**Current Behavior**:
- All sample photos have valid dates
- App is designed to handle this
- Code ready for extension (see dataService.ts)

**Test Result**: ⏭️ DEFERRED
```
Expected: Photos with invalid dates go to "Undated" album
Actual: N/A (MVP only uses valid dates)
```

---

### FR-009: Load and Display Thumbnails Efficiently

**Test Steps**:
1. Open app with 50 sample photos
2. Scroll through albums
3. Observe image loading behavior
4. Check performance

**Verification Checklist**:
- [ ] Images load without lag
- [ ] Scrolling is smooth
- [ ] No "broken image" icons
- [ ] Images appear as user scrolls down
- [ ] Page doesn't freeze while loading
- [ ] All thumbnails eventually display

**Performance Check**:
1. Open DevTools (F12) → Performance tab
2. Record as you scroll through albums
3. Check FPS and performance graph

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Images load smoothly, no lag
Actual: __________________________
```

---

### FR-010: Visual Feedback During Drag-and-Drop

**Test Steps**:
1. Hover over album without dragging
2. Start dragging an album
3. Hover over drop target
4. Release to drop

**Verification Checklist**:

**Hover State**:
- [ ] Cursor changes to "move"
- [ ] Album background changes (shadow/highlight)

**Dragging State**:
- [ ] Album opacity reduces to ~50%
- [ ] Album background is lighter
- [ ] Clear indication it's being dragged

**Drop Target**:
- [ ] When hovering over valid drop target, blue border appears
- [ ] Background changes to light blue
- [ ] Cursor changes to "drop" or similar

**Drop Completion**:
- [ ] Visual feedback clears after drop
- [ ] Album is in new position
- [ ] No UI glitches

**Visual Feedback Checklist**:
- [ ] Cursor: ✅ Changes on hover and drag
- [ ] Opacity: ✅ Changes while dragging
- [ ] Color: ✅ Drop target highlighted
- [ ] Shadow: ✅ Depth indication during drag

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Clear visual feedback at each stage
Actual: __________________________
```

---

### FR-011: Persist All User Changes

**Test Steps**:
1. Make multiple changes:
   - Reorder albums
   - Scroll positions (browser memory)
2. Save and close browser
3. Reopen app

**Verification Checklist**:
- [ ] Album order is the same as when closed
- [ ] All changes are preserved
- [ ] No data loss
- [ ] localStorage shows persisted data

**Multiple Change Test**:
```
1. Reorder album A from position 1 to 3
2. Reorder album B from position 2 to 1
3. Refresh page
4. Verify: Album B at position 1, Album A at position 3
5. Close browser completely
6. Reopen
7. Verify: Order still correct
```

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: All changes persisted across sessions
Actual: __________________________
```

---

### FR-012: Display Albums in Chronological Order

**Test Steps**:
1. Note all album dates
2. Verify they are in order
3. Create new albums (if possible)
4. Verify new albums maintain order

**Verification Checklist**:
- [ ] Albums are sorted chronologically
- [ ] Oldest album appears first
- [ ] Newest album appears last
- [ ] Order is consistent (not random)
- [ ] Dates are in ascending order

**Manual Verification**:
```
Album 1: November 10, 2024
Album 2: November 15, 2024
Album 3: November 20, 2024

✅ Correct order (oldest → newest)
```

**Date Comparison**:
```javascript
// In console
const state = JSON.parse(localStorage.getItem('photoAlbumAppState'))
const dates = state.albums.map(a => new Date(a.date).getTime())
const sorted = dates.every((d, i, arr) => i === 0 || d >= arr[i-1])
console.log('Chronologically sorted:', sorted)
// Should print: true
```

**Test Result**: ✅ PASS / ❌ FAIL
```
Expected: Albums sorted oldest to newest
Actual: __________________________
```

---

## User Story Testing

### User Story 1: View and Explore Photo Albums

**Test Scenarios**:
1. Can I see all albums on main page?
   - [ ] Yes, all visible
   
2. Are albums organized by date?
   - [ ] Yes, chronological
   
3. Can I scroll to see all photos?
   - [ ] Yes, responsive

**Result**: ✅ PASS / ❌ FAIL

---

### User Story 2: Reorganize Albums via Drag and Drop

**Test Scenarios**:
1. Can I drag albums to new positions?
   - [ ] Yes, smooth drag-drop
   
2. Is there visual feedback?
   - [ ] Yes, clear indication
   
3. Do changes persist?
   - [ ] Yes, after refresh

**Result**: ✅ PASS / ❌ FAIL

---

### User Story 3: View Photos Within Album

**Test Scenarios**:
1. Can I see photos in grid format?
   - [ ] Yes, responsive grid
   
2. Are tiles properly sized?
   - [ ] Yes, consistent
   
3. Do images load efficiently?
   - [ ] Yes, no lag

**Result**: ✅ PASS / ❌ FAIL

---

### User Story 4: Create Albums by Date Grouping

**Test Scenarios**:
1. Are photos auto-grouped by date?
   - [ ] Yes, one date per album
   
2. Are albums labeled with dates?
   - [ ] Yes, human-readable format
   
3. Is date metadata correct?
   - [ ] Yes, matches each photo

**Result**: ✅ PASS / ❌ FAIL

---

### User Story 5: Prevent Album Nesting

**Test Scenarios**:
1. Can I drag album into another?
   - [ ] No, prevented
   
2. Is the UI flat (non-hierarchical)?
   - [ ] Yes, no indentation
   
3. Is data structure flat?
   - [ ] Yes, no parent references

**Result**: ✅ PASS / ❌ FAIL

---

## Quality Checks

### Code Quality

**Check 1: Linting**
```bash
npm run lint
```
Expected: Zero errors, all checks pass

**Check 2: Type Safety**
```bash
# TypeScript is checked during build
npm run build
```
Expected: No type errors

**Check 3: Complexity**
```javascript
// Check function complexity (max 10)
// All functions in dataService.ts and storageService.ts
// Should be < 10
```

---

### Browser Compatibility

Test in each browser:

| Browser | Test | Result |
|---------|------|--------|
| Chrome | Launch, drag, persist | ✅/❌ |
| Firefox | Launch, drag, persist | ✅/❌ |
| Safari | Launch, drag, persist | ✅/❌ |
| Edge | Launch, drag, persist | ✅/❌ |

---

## Performance Testing

### Load Time Test

```bash
# Development build
npm start
# Measure time from click to page visible
# Target: < 2 seconds
```

### Drag-Drop Responsiveness

1. Start dragging album
2. Visual feedback appears
3. Measure delay: ___ ms
4. Target: < 100ms

### Scroll Performance

1. Scroll through 50 photos
2. Observe frame rate
3. Target: 60 FPS (smooth)
4. Measurement: ___ FPS

---

## Test Results Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR-001 | ✅/❌ | |
| FR-002 | ✅/❌ | |
| FR-003 | ✅/❌ | |
| FR-004 | ✅/❌ | |
| FR-005 | ✅/❌ | |
| FR-006 | ✅/❌ | |
| FR-007 | ✅/❌ | |
| FR-008 | ⏭️ | Deferred |
| FR-009 | ✅/❌ | |
| FR-010 | ✅/❌ | |
| FR-011 | ✅/❌ | |
| FR-012 | ✅/❌ | |

**Overall**: ___ / 12 PASS

---

## Troubleshooting

### Images Not Loading
- Check network in DevTools
- Try refreshing page
- Check image URLs in localStorage

### localStorage Not Working
- Check if in private/incognito mode
- Check DevTools → Application → Storage
- Try clearing storage and restarting

### Drag-Drop Not Working
- Use desktop browser (not mobile)
- Try different browser
- Check for extensions interfering

### App Crashes
- Check DevTools console for errors
- Clear localStorage
- Reinstall dependencies
- Check Node.js version (16+)

---

## Sign-Off

**Tester Name**: ________________
**Date**: ________________
**Overall Result**: ✅ PASS / ❌ FAIL

**Comments**:
```
_____________________________________________
_____________________________________________
_____________________________________________
```

---

**Testing Guide Version**: 1.0
**Last Updated**: 2024-11-17
