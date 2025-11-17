import { useState, useMemo, useCallback } from 'react';

/**
 * SearchService - Comprehensive search and filtering for albums
 * Provides full-text search, autocomplete, and advanced filtering
 */

interface SearchFilter {
  dateFrom?: string;
  dateTo?: string;
  minPhotos?: number;
  maxPhotos?: number;
  status?: 'active' | 'archived';
  query?: string;
}

interface SearchResult {
  id: string;
  title: string;
  date: string;
  photoCount: number;
  relevance: number;
  highlighted?: string;
}

interface SearchStats {
  totalResults: number;
  queryTime: number;
  filters: SearchFilter;
}

export class SearchService {
  private index: Map<string, string[]> = new Map();
  private albums: any[] = [];
  private searchHistory: string[] = [];
  private maxHistorySize: number = 10;

  /**
   * Initialize search index from albums
   */
  buildIndex(albums: any[]): void {
    this.albums = albums;
    this.index.clear();

    albums.forEach((album) => {
      const tokens = this.tokenize(album.title);
      const dateTokens = album.date
        .split('-')
        .filter((part: string) => part.length > 0);

      const allTokens = [...tokens, ...dateTokens];

      allTokens.forEach((token) => {
        if (!this.index.has(token)) {
          this.index.set(token, []);
        }
        const ids = this.index.get(token);
        if (ids && !ids.includes(album.id)) {
          ids.push(album.id);
        }
      });
    });
  }

  /**
   * Tokenize search query
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .map((token) => token.replace(/[^\w]/g, ''));
  }

  /**
   * Execute search with filters
   */
  search(
    query: string,
    filters: SearchFilter = {}
  ): { results: SearchResult[]; stats: SearchStats } {
    const startTime = performance.now();

    // Add to search history
    if (query.trim()) {
      this.addToHistory(query);
    }

    // Tokenize query
    const queryTokens = this.tokenize(query);

    // Find matching album IDs
    let matchingIds = new Set<string>();

    if (queryTokens.length === 0) {
      // No query - return all albums
      this.albums.forEach((album) => matchingIds.add(album.id));
    } else {
      // Find albums matching all query tokens
      queryTokens.forEach((token, index) => {
        const matchesForToken = new Set<string>();

        // Direct matches
        const directMatches = this.index.get(token) || [];
        directMatches.forEach((id) => matchesForToken.add(id));

        // Prefix matches
        this.index.forEach((albumIds, indexToken) => {
          if (indexToken.startsWith(token)) {
            albumIds.forEach((id) => matchesForToken.add(id));
          }
        });

        if (index === 0) {
          matchingIds = matchesForToken;
        } else {
          matchingIds = new Set(
            [...matchingIds].filter((id) => matchesForToken.has(id))
          );
        }
      });
    }

    // Convert to results with filtering
    let results = Array.from(matchingIds)
      .map((id) => this.albums.find((a) => a.id === id))
      .filter((album) => album && this.matchesFilters(album, filters))
      .map((album) => ({
        id: album.id,
        title: album.title,
        date: album.date,
        photoCount: album.photoCount || 0,
        relevance: this.calculateRelevance(album.title, query),
        highlighted: this.highlightMatches(album.title, query),
      }))
      .sort((a, b) => b.relevance - a.relevance);

    const queryTime = performance.now() - startTime;

    return {
      results,
      stats: {
        totalResults: results.length,
        queryTime,
        filters,
      },
    };
  }

  /**
   * Get search suggestions (autocomplete)
   */
  getSuggestions(query: string, limit: number = 5): string[] {
    if (!query.trim()) {
      return [];
    }

    const token = this.tokenize(query)[0];
    const suggestions = new Set<string>();

    // Find matching albums
    const matchingIds = this.index.get(token) || [];
    matchingIds.slice(0, limit).forEach((id) => {
      const album = this.albums.find((a) => a.id === id);
      if (album && album.title) {
        suggestions.add(album.title);
      }
    });

    // Find prefix matches
    this.index.forEach((albumIds, indexToken) => {
      if (indexToken.startsWith(token) && suggestions.size < limit) {
        albumIds.forEach((id) => {
          if (suggestions.size < limit) {
            const album = this.albums.find((a) => a.id === id);
            if (album) {
              suggestions.add(album.title);
            }
          }
        });
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Apply advanced filters
   */
  private matchesFilters(album: any, filters: SearchFilter): boolean {
    // Date range filter
    if (filters.dateFrom && album.date < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && album.date > filters.dateTo) {
      return false;
    }

    // Photo count filter
    const photoCount = album.photoCount || 0;
    if (filters.minPhotos && photoCount < filters.minPhotos) {
      return false;
    }
    if (filters.maxPhotos && photoCount > filters.maxPhotos) {
      return false;
    }

    // Status filter
    if (filters.status) {
      const albumStatus = album.archived ? 'archived' : 'active';
      if (albumStatus !== filters.status) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(title: string, query: string): number {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match
    if (titleLower === queryLower) {
      return 100;
    }

    // Starts with query
    if (titleLower.startsWith(queryLower)) {
      return 80;
    }

    // Contains query
    if (titleLower.includes(queryLower)) {
      return 60;
    }

    // Token match
    const titleTokens = this.tokenize(title);
    const queryTokens = this.tokenize(query);
    const matchedTokens = queryTokens.filter((token) =>
      titleTokens.some((titleToken) => titleToken.startsWith(token))
    );

    return (matchedTokens.length / queryTokens.length) * 40;
  }

  /**
   * Highlight matching terms in text
   */
  private highlightMatches(text: string, query: string): string {
    if (!query.trim()) {
      return text;
    }

    const tokens = this.tokenize(query);
    let result = text;

    tokens.forEach((token) => {
      const regex = new RegExp(`\\b${token}\\w*`, 'gi');
      result = result.replace(regex, '<mark>$&</mark>');
    });

    return result;
  }

  /**
   * Add query to search history
   */
  private addToHistory(query: string): void {
    this.searchHistory = this.searchHistory.filter((q) => q !== query);
    this.searchHistory.unshift(query);
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory.pop();
    }
  }

  /**
   * Get search history
   */
  getHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
  }

  /**
   * Get popular searches
   */
  getPopularSearches(limit: number = 5): Array<{ term: string; count: number }> {
    const frequency = new Map<string, number>();

    this.searchHistory.forEach((query) => {
      frequency.set(query, (frequency.get(query) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

/**
 * React Hook: useSearch
 * Provides search functionality with memoization
 */
export function useSearch(albums: any[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchService = useMemo(() => new SearchService(), []);

  // Build index when albums change
  useMemo(() => {
    searchService.buildIndex(albums);
  }, [albums, searchService]);

  // Perform search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() && Object.keys(filters).length === 0) {
      return {
        results: albums.map((album) => ({
          id: album.id,
          title: album.title,
          date: album.date,
          photoCount: album.photoCount || 0,
          relevance: 50,
        })),
        stats: {
          totalResults: albums.length,
          queryTime: 0,
          filters: {},
        },
      };
    }

    return searchService.search(searchQuery, filters);
  }, [searchQuery, filters, albums, searchService]);

  // Get suggestions
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.length > 1) {
        setSuggestions(searchService.getSuggestions(query, 5));
      } else {
        setSuggestions([]);
      }
    },
    [searchService]
  );

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    filters,
    setFilters,
    results: searchResults.results,
    stats: searchResults.stats,
    suggestions,
    history: searchService.getHistory(),
    clearHistory: () => searchService.clearHistory(),
    getPopularSearches: (limit?: number) =>
      searchService.getPopularSearches(limit),
  };
}
