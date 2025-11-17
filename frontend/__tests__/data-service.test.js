/**
 * Frontend data service tests
 */

// Mock data service for date grouping and formatting
const createDataServiceMock = () => {
  const groupPhotosByDate = (photos) => {
    const grouped = {}
    photos.forEach((photo) => {
      const date = photo.date || 'Undated'
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(photo)
    })
    return grouped
  }

  const formatDate = (dateString, locale = 'en-US') => {
    if (!dateString || dateString === 'Undated') return 'Undated'
    
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date)
    } catch (err) {
      return 'Invalid Date'
    }
  }

  const getRelativeDate = (dateString) => {
    if (!dateString || dateString === 'Undated') return 'Undated'
    
    try {
      const date = new Date(dateString)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const dateOnly = date.toDateString()
      const todayOnly = today.toDateString()
      const yesterdayOnly = yesterday.toDateString()
      
      if (dateOnly === todayOnly) return 'Today'
      if (dateOnly === yesterdayOnly) return 'Yesterday'
      
      return formatDate(dateString)
    } catch (err) {
      return 'Invalid Date'
    }
  }

  const parseDate = (dateString) => {
    try {
      return new Date(dateString)
    } catch (err) {
      return null
    }
  }

  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1).toDateString()
    const d2 = new Date(date2).toDateString()
    return d1 === d2
  }

  const sortPhotosByDate = (photos, ascending = false) => {
    return [...photos].sort((a, b) => {
      const dateA = new Date(a.date || 0)
      const dateB = new Date(b.date || 0)
      return ascending ? dateA - dateB : dateB - dateA
    })
  }

  return {
    groupPhotosByDate,
    formatDate,
    getRelativeDate,
    parseDate,
    isSameDay,
    sortPhotosByDate
  }
}

describe('Frontend Data Service', () => {
  let dataService

  beforeEach(() => {
    dataService = createDataServiceMock()
  })

  describe('Date Formatting', () => {
    it('should format date to locale string', () => {
      const formatted = dataService.formatDate('2024-11-17')
      expect(formatted).toMatch(/November 17, 2024|17 november 2024|17. November 2024/i)
    })

    it('should handle undated photos', () => {
      const formatted = dataService.formatDate('Undated')
      expect(formatted).toBe('Undated')
    })

    it('should handle null dates', () => {
      const formatted = dataService.formatDate(null)
      expect(formatted).toBe('Undated')
    })

    it('should support different locales', () => {
      const enFormatted = dataService.formatDate('2024-11-17', 'en-US')
      const frFormatted = dataService.formatDate('2024-11-17', 'fr-FR')
      
      expect(enFormatted).toBeTruthy()
      expect(frFormatted).toBeTruthy()
    })

    it('should handle invalid dates', () => {
      const formatted = dataService.formatDate('invalid-date')
      expect(formatted).toBe('Invalid Date')
    })
  })

  describe('Relative Dates', () => {
    it('should return "Today" for current date', () => {
      const today = new Date().toISOString().split('T')[0]
      const relative = dataService.getRelativeDate(today)
      expect(relative).toBe('Today')
    })

    it('should return "Yesterday" for previous date', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const relative = dataService.getRelativeDate(yesterdayStr)
      expect(relative).toBe('Yesterday')
    })

    it('should return formatted date for older dates', () => {
      const oldDate = dataService.getRelativeDate('2024-01-01')
      expect(oldDate).toMatch(/January 1, 2024|1 January 2024|1. Januar 2024/i)
    })

    it('should handle undated photos', () => {
      const relative = dataService.getRelativeDate('Undated')
      expect(relative).toBe('Undated')
    })

    it('should handle null dates', () => {
      const relative = dataService.getRelativeDate(null)
      expect(relative).toBe('Undated')
    })
  })

  describe('Date Grouping', () => {
    it('should group photos by date', () => {
      const photos = [
        { id: '1', date: '2024-11-17' },
        { id: '2', date: '2024-11-17' },
        { id: '3', date: '2024-11-16' }
      ]
      const grouped = dataService.groupPhotosByDate(photos)
      
      expect(grouped['2024-11-17'].length).toBe(2)
      expect(grouped['2024-11-16'].length).toBe(1)
    })

    it('should handle undated photos', () => {
      const photos = [
        { id: '1', date: '2024-11-17' },
        { id: '2' } // No date
      ]
      const grouped = dataService.groupPhotosByDate(photos)
      
      expect(grouped['2024-11-17'].length).toBe(1)
      expect(grouped['Undated'].length).toBe(1)
    })

    it('should return empty object for empty array', () => {
      const grouped = dataService.groupPhotosByDate([])
      expect(Object.keys(grouped).length).toBe(0)
    })

    it('should handle mixed dates', () => {
      const photos = [
        { id: '1', date: '2024-11-17' },
        { id: '2', date: '2024-11-16' },
        { id: '3', date: '2024-11-17' },
        { id: '4', date: '2024-11-15' }
      ]
      const grouped = dataService.groupPhotosByDate(photos)
      
      expect(Object.keys(grouped).length).toBe(3)
      expect(grouped['2024-11-17'].length).toBe(2)
    })
  })

  describe('Date Comparison', () => {
    it('should identify same day', () => {
      const result = dataService.isSameDay('2024-11-17', '2024-11-17')
      expect(result).toBe(true)
    })

    it('should identify different days', () => {
      const result = dataService.isSameDay('2024-11-17', '2024-11-16')
      expect(result).toBe(false)
    })

    it('should handle time differences on same day', () => {
      const result = dataService.isSameDay(
        '2024-11-17T10:00:00Z',
        '2024-11-17T20:00:00Z'
      )
      expect(result).toBe(true)
    })
  })

  describe('Date Parsing', () => {
    it('should parse valid date string', () => {
      const parsed = dataService.parseDate('2024-11-17')
      expect(parsed).toBeInstanceOf(Date)
      expect(parsed.getFullYear()).toBe(2024)
    })

    it('should handle ISO format', () => {
      const parsed = dataService.parseDate('2024-11-17T10:30:00Z')
      expect(parsed).toBeInstanceOf(Date)
    })

    it('should return null for invalid dates', () => {
      const parsed = dataService.parseDate('invalid')
      expect(parsed).toBeNull()
    })
  })

  describe('Photo Sorting', () => {
    it('should sort photos by date descending (newest first)', () => {
      const photos = [
        { id: '1', date: '2024-11-15' },
        { id: '2', date: '2024-11-17' },
        { id: '3', date: '2024-11-16' }
      ]
      const sorted = dataService.sortPhotosByDate(photos)
      
      expect(sorted[0].date).toBe('2024-11-17')
      expect(sorted[1].date).toBe('2024-11-16')
      expect(sorted[2].date).toBe('2024-11-15')
    })

    it('should sort photos by date ascending (oldest first)', () => {
      const photos = [
        { id: '1', date: '2024-11-15' },
        { id: '2', date: '2024-11-17' },
        { id: '3', date: '2024-11-16' }
      ]
      const sorted = dataService.sortPhotosByDate(photos, true)
      
      expect(sorted[0].date).toBe('2024-11-15')
      expect(sorted[1].date).toBe('2024-11-16')
      expect(sorted[2].date).toBe('2024-11-17')
    })

    it('should handle undated photos in sorting', () => {
      const photos = [
        { id: '1', date: '2024-11-17' },
        { id: '2' },
        { id: '3', date: '2024-11-16' }
      ]
      const sorted = dataService.sortPhotosByDate(photos)
      
      // Undated photos should be at the end
      expect(sorted[sorted.length - 1].id).toBe('2')
    })

    it('should not mutate original array', () => {
      const photos = [
        { id: '1', date: '2024-11-15' },
        { id: '2', date: '2024-11-17' }
      ]
      const sorted = dataService.sortPhotosByDate(photos)
      
      expect(photos[0].id).toBe('1')
      expect(sorted[0].id).toBe('2')
    })
  })

  describe('Edge Cases', () => {
    it('should handle timezone differences', () => {
      const date1 = '2024-11-17T00:00:00Z'
      const date2 = '2024-11-17T23:59:59Z'
      expect(dataService.isSameDay(date1, date2)).toBe(true)
    })

    it('should handle leap year dates', () => {
      const formatted = dataService.formatDate('2024-02-29')
      expect(formatted).toMatch(/February|février|Februar/i)
    })

    it('should handle year boundaries', () => {
      const date1 = '2024-12-31'
      const date2 = '2025-01-01'
      expect(dataService.isSameDay(date1, date2)).toBe(false)
    })

    it('should handle very old dates', () => {
      const formatted = dataService.formatDate('1900-01-01')
      expect(formatted).toMatch(/January 1, 1900|1 January 1900|1. Januar 1900/i)
    })

    it('should handle future dates', () => {
      const formatted = dataService.formatDate('2100-12-31')
      expect(formatted).toMatch(/December 31, 2100|31 December 2100|31. Dezember 2100/i)
    })
  })
})
