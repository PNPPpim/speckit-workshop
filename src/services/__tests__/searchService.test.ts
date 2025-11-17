import { SearchService, useSearch } from '../searchService';
import { renderHook, act } from '@testing-library/react';

describe('SearchService', () => {
  let searchService: SearchService;
  const mockAlbums = [
    {
      id: '1',
      title: 'Summer Vacation 2024',
      date: '2024-07-15',
      photoCount: 45,
    },
    {
      id: '2',
      title: 'Beach Day',
      date: '2024-07-10',
      photoCount: 23,
    },
    {
      id: '3',
      title: 'Mountain Hiking',
      date: '2024-06-05',
      photoCount: 67,
    },
    {
      id: '4',
      title: 'City Tour',
      date: '2024-05-20',
      photoCount: 12,
    },
  ];

  beforeEach(() => {
    searchService = new SearchService();
    searchService.buildIndex(mockAlbums);
  });

  describe('buildIndex', () => {
    it('should build search index from albums', () => {
      const service = new SearchService();
      service.buildIndex(mockAlbums);
      expect(service.search('Summer').results.length).toBeGreaterThan(0);
    });

    it('should handle empty albums', () => {
      const service = new SearchService();
      service.buildIndex([]);
      const results = service.search('test');
      expect(results.results.length).toBe(0);
    });
  });

  describe('search', () => {
    it('should find albums by title', () => {
      const result = searchService.search('Summer');
      expect(result.results.length).toBe(1);
      expect(result.results[0].title).toContain('Summer');
    });

    it('should find albums by partial title', () => {
      const result = searchService.search('Beach');
      expect(result.results.length).toBe(1);
      expect(result.results[0].title).toContain('Beach');
    });

    it('should be case-insensitive', () => {
      const result1 = searchService.search('summer');
      const result2 = searchService.search('SUMMER');
      expect(result1.results.length).toBe(result2.results.length);
    });

    it('should handle multiple word queries', () => {
      const result = searchService.search('Summer Vacation');
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching query', () => {
      const result = searchService.search('NonExistent');
      expect(result.results.length).toBe(0);
    });

    it('should return all albums for empty query', () => {
      const result = searchService.search('');
      expect(result.results.length).toBe(mockAlbums.length);
    });

    it('should rank results by relevance', () => {
      const result = searchService.search('Summer');
      expect(result.results[0].relevance).toBeGreaterThan(0);
      if (result.results.length > 1) {
        expect(result.results[0].relevance).toBeGreaterThanOrEqual(
          result.results[1].relevance
        );
      }
    });

    it('should highlight matches in results', () => {
      const result = searchService.search('Summer');
      expect(result.results[0].highlighted).toBeDefined();
    });

    it('should include search time in stats', () => {
      const result = searchService.search('Summer');
      expect(result.stats.queryTime).toBeGreaterThan(0);
    });
  });

  describe('filters', () => {
    it('should filter by date range', () => {
      const result = searchService.search('', {
        dateFrom: '2024-06-01',
        dateTo: '2024-07-31',
      });
      expect(result.results.every((r) => r.date >= '2024-06-01')).toBe(true);
      expect(result.results.every((r) => r.date <= '2024-07-31')).toBe(true);
    });

    it('should filter by minimum photo count', () => {
      const result = searchService.search('', { minPhotos: 40 });
      expect(result.results.every((r) => r.photoCount >= 40)).toBe(true);
    });

    it('should filter by maximum photo count', () => {
      const result = searchService.search('', { maxPhotos: 30 });
      expect(result.results.every((r) => r.photoCount <= 30)).toBe(true);
    });

    it('should filter by photo count range', () => {
      const result = searchService.search('', {
        minPhotos: 20,
        maxPhotos: 50,
      });
      expect(
        result.results.every((r) => r.photoCount >= 20 && r.photoCount <= 50)
      ).toBe(true);
    });

    it('should combine search query with filters', () => {
      const result = searchService.search('Summer', { minPhotos: 30 });
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].title).toContain('Summer');
      expect(result.results[0].photoCount).toBeGreaterThanOrEqual(30);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions for partial query', () => {
      const suggestions = searchService.getSuggestions('Sum', 5);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty suggestions for empty query', () => {
      const suggestions = searchService.getSuggestions('', 5);
      expect(suggestions.length).toBe(0);
    });

    it('should limit suggestions by provided limit', () => {
      const suggestions = searchService.getSuggestions('a', 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should return case-sensitive suggestions', () => {
      const suggestions = searchService.getSuggestions('beach', 5);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('search history', () => {
    it('should add searches to history', () => {
      searchService.search('Summer');
      searchService.search('Beach');
      const history = searchService.getHistory();
      expect(history.length).toBe(2);
    });

    it('should maintain max history size', () => {
      for (let i = 0; i < 15; i++) {
        searchService.search(`query${i}`);
      }
      const history = searchService.getHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    });

    it('should not duplicate searches in history', () => {
      searchService.search('Summer');
      searchService.search('Summer');
      const history = searchService.getHistory();
      const uniqueSearches = new Set(history);
      expect(uniqueSearches.size).toBe(history.length);
    });

    it('should clear history', () => {
      searchService.search('Summer');
      searchService.clearHistory();
      expect(searchService.getHistory().length).toBe(0);
    });
  });

  describe('getPopularSearches', () => {
    it('should return popular searches', () => {
      searchService.search('Summer');
      searchService.search('Summer');
      searchService.search('Beach');
      const popular = searchService.getPopularSearches(2);
      expect(popular.length).toBeGreaterThan(0);
      expect(popular[0].count).toBeGreaterThanOrEqual(popular[1].count);
    });

    it('should limit popular searches', () => {
      for (let i = 0; i < 5; i++) {
        searchService.search(`query${i}`);
      }
      const popular = searchService.getPopularSearches(2);
      expect(popular.length).toBeLessThanOrEqual(2);
    });
  });
});

describe('useSearch hook', () => {
  const mockAlbums = [
    {
      id: '1',
      title: 'Summer Vacation 2024',
      date: '2024-07-15',
      photoCount: 45,
    },
    {
      id: '2',
      title: 'Beach Day',
      date: '2024-07-10',
      photoCount: 23,
    },
  ];

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSearch(mockAlbums));

    expect(result.current.searchQuery).toBe('');
    expect(result.current.results.length).toBe(mockAlbums.length);
    expect(result.current.suggestions.length).toBe(0);
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useSearch(mockAlbums));

    act(() => {
      result.current.setSearchQuery('Summer');
    });

    expect(result.current.searchQuery).toBe('Summer');
    expect(result.current.results.length).toBeGreaterThan(0);
  });

  it('should filter results by query', () => {
    const { result } = renderHook(() => useSearch(mockAlbums));

    act(() => {
      result.current.setSearchQuery('Summer');
    });

    expect(result.current.results[0].title).toContain('Summer');
  });

  it('should provide suggestions', () => {
    const { result } = renderHook(() => useSearch(mockAlbums));

    act(() => {
      result.current.setSearchQuery('Sum');
    });

    expect(result.current.suggestions.length).toBeGreaterThan(0);
  });

  it('should apply filters', () => {
    const { result } = renderHook(() => useSearch(mockAlbums));

    act(() => {
      result.current.setFilters({ minPhotos: 40 });
    });

    expect(
      result.current.results.every((r) => r.photoCount >= 40)
    ).toBe(true);
  });

  it('should combine search and filters', () => {
    const { result } = renderHook(() => useSearch(mockAlbums));

    act(() => {
      result.current.setSearchQuery('Summer');
      result.current.setFilters({ minPhotos: 30 });
    });

    expect(result.current.results.length).toBeGreaterThan(0);
    expect(result.current.results[0].title).toContain('Summer');
    expect(result.current.results[0].photoCount).toBeGreaterThanOrEqual(30);
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useSearch(mockAlbums));

    act(() => {
      result.current.setSearchQuery('Summer');
      result.current.clearHistory();
    });

    expect(result.current.history.length).toBe(0);
  });

  it('should get popular searches', () => {
    const { result } = renderHook(() => useSearch(mockAlbums));

    act(() => {
      result.current.setSearchQuery('Summer');
      result.current.setSearchQuery('Summer');
      result.current.setSearchQuery('Beach');
    });

    const popular = result.current.getPopularSearches(2);
    expect(popular.length).toBeGreaterThan(0);
  });

  it('should update when albums change', () => {
    const { result, rerender } = renderHook(
      ({ albums }) => useSearch(albums),
      { initialProps: { albums: mockAlbums } }
    );

    const newAlbums = [
      ...mockAlbums,
      { id: '3', title: 'New Album', date: '2024-08-01', photoCount: 10 },
    ];

    rerender({ albums: newAlbums });

    act(() => {
      result.current.setSearchQuery('New');
    });

    expect(result.current.results.some((r) => r.title === 'New Album')).toBe(
      true
    );
  });
});
