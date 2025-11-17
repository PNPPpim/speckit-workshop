/**
 * T044: Advanced Search & Recommendations Tests
 * 
 * Comprehensive test suite for:
 * - ML search ranking (TF-IDF algorithm)
 * - Recommendation services (collaborative, content-based, hybrid)
 * - Search history & saved searches
 * - UI components
 */

import mlSearchService from '../services/mlSearchService';
import recommendationService from '../services/recommendationService';
import searchHistoryService from '../services/searchHistoryService';

describe('T044: Advanced Search & Recommendations', () => {
  beforeEach(() => {
    mlSearchService.clearCache();
    recommendationService.clearCache();
    searchHistoryService.clearHistory();
  });

  // ============= ML Search Service Tests =============

  describe('MLSearchService - TF-IDF Ranking', () => {
    it('should calculate TF-IDF vectors correctly', () => {
      const documents = [
        {
          id: 'doc1',
          content: 'beautiful sunset photography landscape mountains',
        },
        {
          id: 'doc2',
          content: 'sunset view evening colors sky',
        },
        {
          id: 'doc3',
          content: 'mountain landscape hiking trail forest',
        },
      ];

      mlSearchService.indexDocuments(documents);

      const results = mlSearchService.search('sunset', [
        { id: 'doc1', title: 'Sunset Photo', description: documents[0].content },
        { id: 'doc2', title: 'Evening Sky', description: documents[1].content },
        { id: 'doc3', title: 'Mountain Trail', description: documents[2].content },
      ]);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('doc1'); // Should rank doc1 higher
      expect(results[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should rank documents by relevance score', () => {
      const documents = [
        { id: 'doc1', content: 'photography sunset beautiful' },
        { id: 'doc2', content: 'sunset photography' },
        { id: 'doc3', content: 'landscape mountains' },
      ];

      mlSearchService.indexDocuments(documents);

      const results = mlSearchService.search('photography', [
        { id: 'doc1', title: 'Photo 1', description: documents[0].content },
        { id: 'doc2', title: 'Photo 2', description: documents[1].content },
        { id: 'doc3', title: 'Photo 3', description: documents[2].content },
      ]);

      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(results[1].relevanceScore);
      if (results.length > 2) {
        expect(results[1].relevanceScore).toBeGreaterThanOrEqual(results[2].relevanceScore);
      }
    });

    it('should apply CTR weighting to ranking', () => {
      const documents = [
        { id: 'doc1', content: 'photography' },
        { id: 'doc2', content: 'photography' },
      ];

      mlSearchService.indexDocuments(documents);

      // Record interactions for doc1
      for (let i = 0; i < 10; i++) {
        mlSearchService.recordInteraction('doc1', true);
      }

      const results = mlSearchService.search('photography', [
        { id: 'doc1', title: 'Photo 1', description: documents[0].content },
        { id: 'doc2', title: 'Photo 2', description: documents[1].content },
      ]);

      expect(results[0].ctrWeight).toBeGreaterThan(1.0);
    });

    it('should filter results with zero relevance score', () => {
      const documents = [{ id: 'doc1', content: 'photography sunset' }];

      mlSearchService.indexDocuments(documents);

      const results = mlSearchService.search('mountain', [
        { id: 'doc1', title: 'Photo 1', description: documents[0].content },
      ]);

      expect(results.length).toBe(0);
    });

    it('should provide search metrics', () => {
      const documents = [{ id: 'doc1', content: 'photography' }];

      mlSearchService.indexDocuments(documents);
      mlSearchService.recordInteraction('doc1', true);
      mlSearchService.recordInteraction('doc1', true);
      mlSearchService.recordInteraction('doc1', false);

      const metrics = mlSearchService.getMetrics();

      expect(metrics.totalInteractions).toBe(3);
      expect(metrics.averageCTR).toBeCloseTo(0.667, 2);
    });
  });

  // ============= Recommendation Service Tests =============

  describe('RecommendationService - Collaborative Filtering', () => {
    it('should get collaborative recommendations based on similar users', () => {
      const albums = [
        { id: 'album1', title: 'Sunset', tags: ['nature'], category: 'landscape', photographer: 'john' },
        { id: 'album2', title: 'Mountain', tags: ['nature'], category: 'landscape', photographer: 'jane' },
        { id: 'album3', title: 'Portrait', tags: ['people'], category: 'portrait', photographer: 'john' },
      ];

      albums.forEach((album) => recommendationService.registerAlbum(album));

      // User 1 views albums 1 and 2
      recommendationService.recordView('user1', 'album1');
      recommendationService.recordView('user1', 'album2');

      // User 2 views albums 1 and 2 (similar to user1)
      recommendationService.recordView('user2', 'album1');
      recommendationService.recordView('user2', 'album2');

      // Get collaborative recommendations for user 1
      const recs = recommendationService.getCollaborativeRecommendations('user1', 5);

      expect(Array.isArray(recs)).toBe(true);
    });

    it('should not recommend already viewed albums', () => {
      const albums = [
        { id: 'album1', title: 'A', tags: [], category: 'gen', photographer: 'a' },
        { id: 'album2', title: 'B', tags: [], category: 'gen', photographer: 'a' },
      ];

      albums.forEach((album) => recommendationService.registerAlbum(album));

      recommendationService.recordView('user1', 'album1');
      recommendationService.recordView('user1', 'album2');

      const recs = recommendationService.getCollaborativeRecommendations('user1', 5);

      expect(recs.every((r) => r.albumId !== 'album1')).toBe(true);
      expect(recs.every((r) => r.albumId !== 'album2')).toBe(true);
    });
  });

  describe('RecommendationService - Content-Based', () => {
    it('should recommend similar albums based on tags', () => {
      const albums = [
        { id: 'album1', title: 'Sunset 1', tags: ['sunset', 'nature'], category: 'landscape', photographer: 'a' },
        { id: 'album2', title: 'Sunset 2', tags: ['sunset', 'nature'], category: 'landscape', photographer: 'b' },
        { id: 'album3', title: 'Portrait', tags: ['people'], category: 'portrait', photographer: 'c' },
      ];

      albums.forEach((album) => recommendationService.registerAlbum(album));

      recommendationService.recordView('user1', 'album1');

      const recs = recommendationService.getContentBasedRecommendations('user1', 5);

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].albumId).toBe('album2'); // Should recommend similar sunset album
    });

    it('should score recommendations based on category match', () => {
      const albums = [
        { id: 'album1', title: 'Landscape 1', tags: ['nature'], category: 'landscape', photographer: 'a' },
        { id: 'album2', title: 'Landscape 2', tags: ['nature'], category: 'landscape', photographer: 'b' },
        { id: 'album3', title: 'Landscape 3', tags: ['nature'], category: 'landscape', photographer: 'c' },
      ];

      albums.forEach((album) => recommendationService.registerAlbum(album));

      recommendationService.recordView('user1', 'album1');

      const recs = recommendationService.getContentBasedRecommendations('user1', 5);

      expect(recs.length).toBeGreaterThan(0);
      recs.forEach((rec) => expect(rec.score).toBeGreaterThan(0));
    });
  });

  describe('RecommendationService - Hybrid', () => {
    it('should combine collaborative and content-based recommendations', () => {
      const albums = [
        { id: 'album1', title: 'A', tags: ['tag1'], category: 'cat1', photographer: 'p1' },
        { id: 'album2', title: 'B', tags: ['tag1'], category: 'cat1', photographer: 'p2' },
        { id: 'album3', title: 'C', tags: ['tag2'], category: 'cat2', photographer: 'p3' },
      ];

      albums.forEach((album) => recommendationService.registerAlbum(album));

      recommendationService.recordView('user1', 'album1');
      recommendationService.recordView('user2', 'album1');
      recommendationService.recordView('user2', 'album2');

      const recs = recommendationService.getHybridRecommendations('user1', 5);

      expect(recs.length).toBeGreaterThan(0);
      recs.forEach((rec) => {
        expect(rec.algorithm).toBe('hybrid');
        expect(rec.score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('RecommendationService - Trending', () => {
    it('should identify trending albums based on views', () => {
      const albums = [
        { id: 'album1', title: 'Popular', tags: [], category: 'gen', photographer: 'a' },
        { id: 'album2', title: 'Less Popular', tags: [], category: 'gen', photographer: 'b' },
      ];

      albums.forEach((album) => recommendationService.registerAlbum(album));

      // Album 1 viewed by many users
      for (let i = 0; i < 5; i++) {
        recommendationService.recordView(`user${i}`, 'album1');
      }

      // Album 2 viewed by few users
      recommendationService.recordView('user5', 'album2');

      const recs = recommendationService.getTrendingRecommendations(5);

      expect(recs[0].albumId).toBe('album1');
    });
  });

  // ============= Search History Service Tests =============

  describe('SearchHistoryService - History Management', () => {
    it('should add searches to history', () => {
      searchHistoryService.addToHistory('landscape', 42);
      searchHistoryService.addToHistory('sunset', 15);

      const history = searchHistoryService.getHistory(10);

      expect(history.length).toBe(2);
      expect(history[0].query).toBe('sunset');
    });

    it('should limit history to maximum entries', () => {
      for (let i = 0; i < 100; i++) {
        searchHistoryService.addToHistory(`query${i}`, 1);
      }

      const history = searchHistoryService.getHistory(100);

      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('should record search result clicks', () => {
      const entry = searchHistoryService.addToHistory('test', 5);

      searchHistoryService.recordResultClick(entry.id);

      const history = searchHistoryService.getHistory(1);

      expect(history[0].clicked).toBe(true);
    });

    it('should generate search suggestions from history', () => {
      searchHistoryService.addToHistory('sunset landscape', 10);
      searchHistoryService.addToHistory('sunset photography', 8);
      searchHistoryService.addToHistory('sunset colors', 6);
      searchHistoryService.addToHistory('mountain landscape', 5);

      const suggestions = searchHistoryService.generateSuggestions('sunset', 3);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].startsWith('sunset')).toBe(true);
    });

    it('should get trending searches', () => {
      searchHistoryService.addToHistory('sunset', 10);
      searchHistoryService.addToHistory('sunset', 8);
      searchHistoryService.addToHistory('landscape', 6);

      const trending = searchHistoryService.getTrendingSearches(5);

      expect(trending[0].query).toBe('sunset');
      expect(trending[0].count).toBe(2);
    });
  });

  describe('SearchHistoryService - Saved Searches', () => {
    it('should save and retrieve searches', () => {
      const saved = searchHistoryService.saveSearch('My Favorites', 'sunset landscape');

      expect(saved.name).toBe('My Favorites');
      expect(saved.query).toBe('sunset landscape');

      const all = searchHistoryService.getSavedSearches();

      expect(all.length).toBeGreaterThan(0);
      expect(all[0].name).toBe('My Favorites');
    });

    it('should update saved searches', () => {
      const saved = searchHistoryService.saveSearch('Original', 'query1');

      searchHistoryService.updateSavedSearch(saved.id, 'Updated', 'query2');

      const all = searchHistoryService.getSavedSearches();

      expect(all[0].name).toBe('Updated');
      expect(all[0].query).toBe('query2');
    });

    it('should delete saved searches', () => {
      const saved = searchHistoryService.saveSearch('Delete Me', 'query');

      searchHistoryService.deleteSavedSearch(saved.id);

      const all = searchHistoryService.getSavedSearches();

      expect(all.length).toBe(0);
    });
  });

  describe('SearchHistoryService - Export & Statistics', () => {
    it('should export history as CSV', () => {
      searchHistoryService.addToHistory('sunset', 42);
      searchHistoryService.addToHistory('landscape', 15);

      const csv = searchHistoryService.exportAsCSV();

      expect(csv).toContain('Query,Timestamp');
      expect(csv).toContain('sunset');
      expect(csv).toContain('landscape');
    });

    it('should export saved searches as CSV', () => {
      searchHistoryService.saveSearch('Save 1', 'query 1');
      searchHistoryService.saveSearch('Save 2', 'query 2');

      const csv = searchHistoryService.exportSavedSearchesAsCSV();

      expect(csv).toContain('Name,Query');
      expect(csv).toContain('Save 1');
      expect(csv).toContain('Save 2');
    });

    it('should provide search statistics', () => {
      searchHistoryService.addToHistory('sunset', 10);
      searchHistoryService.addToHistory('landscape', 5);
      searchHistoryService.addToHistory('sunset', 8);
      searchHistoryService.saveSearch('Saved', 'query');

      const stats = searchHistoryService.getStatistics();

      expect(stats.totalSearches).toBe(3);
      expect(stats.uniqueQueries).toBe(2);
      expect(stats.savedSearchesCount).toBe(1);
      expect(stats.averageResultsPerSearch).toBe(7.67);
    });
  });

  // ============= Integration Tests =============

  describe('Integration - Full Search & Recommendation Flow', () => {
    it('should complete full search to recommendation flow', () => {
      // Setup albums
      const albums = [
        { id: 'album1', title: 'Sunset', tags: ['sunset', 'nature'], category: 'landscape', photographer: 'john' },
        { id: 'album2', title: 'Mountain', tags: ['nature'], category: 'landscape', photographer: 'jane' },
        { id: 'album3', title: 'Portrait', tags: ['people'], category: 'portrait', photographer: 'john' },
      ];

      albums.forEach((album) => recommendationService.registerAlbum(album));
      mlSearchService.indexDocuments(
        albums.map((a) => ({ id: a.id, content: `${a.title} ${a.tags.join(' ')}` })),
      );

      // Search for sunset
      const searchResults = mlSearchService.search('sunset', albums);

      expect(searchResults.length).toBeGreaterThan(0);

      // User views search result
      searchHistoryService.addToHistory('sunset', searchResults.length);
      recommendationService.recordView('user1', searchResults[0].id);

      // Get recommendations
      const recs = recommendationService.getHybridRecommendations('user1', 5);

      expect(Array.isArray(recs)).toBe(true);
    });
  });

  // ============= Performance Tests =============

  describe('Performance - Optimization Targets', () => {
    it('ML ranking should complete in < 200ms', () => {
      const albums = Array.from({ length: 100 }, (_, i) => ({
        id: `album${i}`,
        title: `Album ${i}`,
        tags: [`tag${i % 10}`],
        category: `category${i % 5}`,
        photographer: `photographer${i % 20}`,
      }));

      const documents = albums.map((a) => ({
        id: a.id,
        content: `${a.title} ${a.tags.join(' ')}`,
      }));

      mlSearchService.indexDocuments(documents);

      const startTime = performance.now();
      mlSearchService.search('album', albums.slice(0, 50));
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
    });

    it('Recommendation generation should complete in < 200ms', () => {
      const albums = Array.from({ length: 50 }, (_, i) => ({
        id: `album${i}`,
        title: `Album ${i}`,
        tags: [`tag${i % 5}`],
        category: `category${i % 3}`,
        photographer: `photographer${i % 10}`,
      }));

      albums.forEach((album) => recommendationService.registerAlbum(album));

      // Simulate user views
      for (let i = 0; i < 20; i++) {
        recommendationService.recordView(`user${i}`, `album${i}`);
      }

      const startTime = performance.now();
      recommendationService.getHybridRecommendations('user0', 8);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});
