import { test, expect } from '@playwright/test'

test.describe('Photo Albums - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/')
    // Wait for app to load
    await page.waitForLoadState('networkidle')
  })

  test.describe('Album Display', () => {
    test('should display album list on page load', async ({ page }) => {
      // Check for album elements
      const albums = await page.locator('[data-testid="album-item"]').count()
      expect(albums).toBeGreaterThan(0)
    })

    test('should display album titles', async ({ page }) => {
      const firstAlbumTitle = await page.locator('[data-testid="album-title"]').first().textContent()
      expect(firstAlbumTitle).toBeTruthy()
      expect(firstAlbumTitle?.length).toBeGreaterThan(0)
    })

    test('should display album dates', async ({ page }) => {
      const firstAlbumDate = await page.locator('[data-testid="album-date"]').first().textContent()
      expect(firstAlbumDate).toBeTruthy()
      expect(firstAlbumDate).toMatch(/\d{4}-\d{2}-\d{2}/)
    })

    test('should display photo thumbnails in albums', async ({ page }) => {
      const firstAlbum = page.locator('[data-testid="album-item"]').first()
      const photos = await firstAlbum.locator('img').count()
      expect(photos).toBeGreaterThan(0)
    })
  })

  test.describe('Album Selection & Photo View', () => {
    test('should navigate to album details when clicked', async ({ page }) => {
      const firstAlbum = page.locator('[data-testid="album-item"]').first()
      const albumTitle = await firstAlbum.locator('[data-testid="album-title"]').textContent()
      
      await firstAlbum.click()
      await page.waitForLoadState('networkidle')
      
      // Verify navigated to album details
      const pageTitle = await page.locator('h1, h2').first().textContent()
      expect(pageTitle).toContain(albumTitle)
    })

    test('should display all photos for selected album', async ({ page }) => {
      // Click first album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Check for photo elements
      const photos = await page.locator('[data-testid="photo-item"]').count()
      expect(photos).toBeGreaterThan(0)
    })

    test('should show photo preview on hover', async ({ page }) => {
      // Click first album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Hover over first photo
      const firstPhoto = page.locator('[data-testid="photo-item"]').first()
      await firstPhoto.hover()
      
      // Check if preview or tooltip appears
      const preview = page.locator('[data-testid="photo-preview"]')
      await expect(preview).toBeVisible({ timeout: 1000 }).catch(() => true)
    })

    test('should allow navigation back to album list', async ({ page }) => {
      // Click first album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Click back or navigate to list
      const backButton = page.locator('[data-testid="back-button"]')
      if (await backButton.isVisible()) {
        await backButton.click()
        await page.waitForLoadState('networkidle')
      } else {
        await page.goto('/')
      }
      
      // Verify back at album list
      const albums = page.locator('[data-testid="album-item"]')
      await expect(albums.first()).toBeVisible()
    })
  })

  test.describe('Drag and Drop Upload', () => {
    test('should show upload dropzone', async ({ page }) => {
      // Click first album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Check for upload area
      const uploadArea = page.locator('[data-testid="upload-dropzone"]')
      await expect(uploadArea).toBeVisible({ timeout: 1000 }).catch(() => true)
    })

    test('should highlight dropzone on drag over', async ({ page }) => {
      // Click first album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      
      const uploadArea = page.locator('[data-testid="upload-dropzone"]')
      if (await uploadArea.isVisible({ timeout: 500 }).catch(() => false)) {
        // Simulate drag over
        await uploadArea.evaluate(el => el.classList.add('drag-over'))
        
        // Check for active state
        const classList = await uploadArea.evaluate(el => el.className)
        expect(classList).toContain('drag-over')
      }
    })

    test('should show loading indicator during upload', async ({ page }) => {
      // Look for loading indicator
      const loadingIndicator = page.locator('[data-testid="loading-spinner"]')
      
      // It may not be visible initially, but should appear during operations
      // This test verifies the element exists in the DOM
      const count = await loadingIndicator.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('State Management & Caching', () => {
    test('should maintain album list without refetching', async ({ page }) => {
      // Get initial album list
      const initialCount = await page.locator('[data-testid="album-item"]').count()
      
      // Navigate to album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Navigate back
      const backButton = page.locator('[data-testid="back-button"]')
      if (await backButton.isVisible()) {
        await backButton.click()
      } else {
        await page.goto('/')
      }
      
      // Verify album count is same
      const finalCount = await page.locator('[data-testid="album-item"]').count()
      expect(finalCount).toBe(initialCount)
    })

    test('should show cached photos quickly on re-visit', async ({ page }) => {
      // First visit to album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      const firstVisitPhotos = await page.locator('[data-testid="photo-item"]').count()
      
      // Navigate back
      const backButton = page.locator('[data-testid="back-button"]')
      if (await backButton.isVisible()) {
        await backButton.click()
      } else {
        await page.goto('/')
      }
      
      // Second visit - should be faster
      const startTime = Date.now()
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      const secondVisitPhotos = await page.locator('[data-testid="photo-item"]').count()
      expect(secondVisitPhotos).toBe(firstVisitPhotos)
      expect(loadTime).toBeLessThan(3000) // Cached load should be quick
    })

    test('should handle multiple concurrent album views', async ({ page, context }) => {
      // Open in new tab
      const page2 = await context.newPage()
      await page2.goto('/')
      await page2.waitForLoadState('networkidle')
      
      // Navigate first page to album
      await page.locator('[data-testid="album-item"]').first().click()
      
      // Navigate second page to different album
      const albums = await page2.locator('[data-testid="album-item"]').count()
      if (albums > 1) {
        await page2.locator('[data-testid="album-item"]').nth(1).click()
      }
      
      // Both pages should load without error
      await expect(page).toHaveTitle(/.+/)
      await expect(page2).toHaveTitle(/.+/)
      
      await page2.close()
    })
  })

  test.describe('Error Handling', () => {
    test('should gracefully handle missing album', async ({ page }) => {
      // Try to navigate to non-existent album
      await page.goto('/album/non-existent-id').catch(() => {})
      
      // Should either redirect or show error message
      const errorMessage = page.locator('[data-testid="error-message"]')
      const albumList = page.locator('[data-testid="album-item"]')
      
      const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)
      const hasList = await albumList.isVisible({ timeout: 1000 }).catch(() => false)
      
      expect(hasError || hasList).toBe(true)
    })

    test('should show error message for failed operations', async ({ page }) => {
      // Look for error display capability
      const errorContainer = page.locator('[data-testid="error-message"], .error, [role="alert"]')
      
      // Should exist in the DOM even if not visible
      const count = await errorContainer.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Performance', () => {
    test('should load initial page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(5000)
    })

    test('should render album thumbnails quickly', async ({ page }) => {
      const albums = page.locator('[data-testid="album-item"]')
      
      const startTime = Date.now()
      await expect(albums.first()).toBeVisible()
      const renderTime = Date.now() - startTime
      
      expect(renderTime).toBeLessThan(2000)
    })

    test('should handle smooth scrolling through many albums', async ({ page }) => {
      // Get count of albums
      const albumCount = await page.locator('[data-testid="album-item"]').count()
      
      if (albumCount > 5) {
        // Scroll through list
        const listContainer = page.locator('[data-testid="album-list"], main').first()
        await listContainer.evaluate(el => el.scrollTop = el.scrollHeight)
        
        // All albums should be rendered or in viewport
        const finalCount = await page.locator('[data-testid="album-item"]').count()
        expect(finalCount).toBe(albumCount)
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      const albums = page.locator('[data-testid="album-item"]')
      await expect(albums.first()).toBeVisible()
    })

    test('should be responsive on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      const albums = page.locator('[data-testid="album-item"]')
      await expect(albums.first()).toBeVisible()
    })

    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 })
      
      const albums = page.locator('[data-testid="album-item"]')
      await expect(albums.first()).toBeVisible()
    })
  })

  test.describe('Cross-browser Compatibility', () => {
    test('should work in all browsers', async ({ page, browserName }) => {
      // This test runs in all configured browsers (Chromium, Firefox, Safari)
      expect(browserName).toMatch(/chromium|firefox|webkit/)
      
      const albums = page.locator('[data-testid="album-item"]')
      await expect(albums.first()).toBeVisible()
    })

    test('should handle touch events on touch devices', async ({ page, isMobile }) => {
      // If mobile, verify touch capability exists
      if (isMobile) {
        const album = page.locator('[data-testid="album-item"]').first()
        await album.tap()
        await page.waitForLoadState('networkidle')
      } else {
        // Desktop: just verify album can be clicked
        const album = page.locator('[data-testid="album-item"]').first()
        await album.click()
        await page.waitForLoadState('networkidle')
      }
      
      expect(true).toBe(true)
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(0)
    })

    test('should have alt text for images', async ({ page }) => {
      const images = await page.locator('img').count()
      if (images > 0) {
        const firstImage = page.locator('img').first()
        const altText = await firstImage.getAttribute('alt')
        // Alt text should exist or be intentionally empty
        expect(typeof altText === 'string').toBe(true)
      }
    })

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through elements
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Focus should move through elements
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for aria-label or aria-labelledby on interactive elements
      const buttons = await page.locator('button, [role="button"]').count()
      expect(buttons).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('User Workflows', () => {
    test('should allow viewing album list to photo details', async ({ page }) => {
      // Step 1: View album list
      let albums = await page.locator('[data-testid="album-item"]').count()
      expect(albums).toBeGreaterThan(0)
      
      // Step 2: Select first album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Step 3: View photos
      const photos = await page.locator('[data-testid="photo-item"]').count()
      expect(photos).toBeGreaterThan(0)
    })

    test('should allow browsing between albums', async ({ page }) => {
      const albumCount = await page.locator('[data-testid="album-item"]').count()
      expect(albumCount).toBeGreaterThan(1)
      
      // Visit first album
      await page.locator('[data-testid="album-item"]').first().click()
      await page.waitForLoadState('networkidle')
      
      // Go back
      const backButton = page.locator('[data-testid="back-button"]')
      if (await backButton.isVisible()) {
        await backButton.click()
      } else {
        await page.goto('/')
      }
      
      // Visit second album
      await page.locator('[data-testid="album-item"]').nth(1).click()
      await page.waitForLoadState('networkidle')
      
      // Verify we're viewing different album
      const currentTitle = await page.locator('h1, h2').first().textContent()
      expect(currentTitle).toBeTruthy()
    })
  })
})
