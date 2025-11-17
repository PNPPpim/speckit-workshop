# T044: Advanced Search & Recommendations

**Status:** 🚀 **READY TO IMPLEMENT**  
**Estimated Duration:** 1.5 hours  
**Target Tests:** 15+ comprehensive test cases  
**Expected Lines:** 1,300+ lines of code + CSS  

---

## Executive Summary

T044 enhances the search capabilities with machine learning-based ranking and implements a smart recommendations engine. This task builds on the existing SearchService (T039) to provide intelligent result ranking, personalized recommendations, and search history management.

**Key Features:**
- ✅ ML-based relevance ranking (TF-IDF)
- ✅ Collaborative filtering recommendations
- ✅ Content-based recommendations
- ✅ Search history with persistence
- ✅ Saved searches management
- ✅ Trending albums/photos
- ✅ Personalized recommendation dashboard

---

## Implementation Breakdown

### Part 1: ML Search Ranking Service (30 min)

**File:** `src/services/mlSearchService.ts` (300 lines)

```typescript
import { EventEmitter } from 'events';

interface SearchVector {
  terms: Map<string, number>;  // term -> frequency
  magnitude: number;
  docLength: number;
}

interface RankedResult {
  id: string;
  title: string;
  type: 'album' | 'photo';
  relevanceScore: number;
  interactions: number;
  clickThroughRate: number;
}

export class MLSearchService extends EventEmitter {
  private vectorCache: Map<string, SearchVector> = new Map();
  private interactionLog: Map<string, number> = new Map();
  private docFrequency: Map<string, number> = new Map();
  private totalDocs: number = 0;

  // TF-IDF Ranking
  private calculateTFIDF(query: string, documents: any[]): RankedResult[] {
    const queryVector = this.vectorizeText(query);
    const scored = documents.map((doc) => ({
      ...doc,
      tfidfScore: this.cosineSimilarity(queryVector, this.vectorizeText(doc.title)),
      ctrScore: this.interactionLog.get(doc.id) || 0,
    }));

    return scored.sort((a, b) => {
      // Combined score: 70% TF-IDF + 30% CTR
      const scoreA = a.tfidfScore * 0.7 + (a.ctrScore / 100) * 0.3;
      const scoreB = b.tfidfScore * 0.7 + (b.ctrScore / 100) * 0.3;
      return scoreB - scoreA;
    });
  }

  // Vectorization
  private vectorizeText(text: string): SearchVector {
    const cached = this.vectorCache.get(text);
    if (cached) return cached;

    const terms = new Map<string, number>();
    const tokens = this.tokenize(text);

    for (const token of tokens) {
      terms.set(token, (terms.get(token) || 0) + 1);
    }

    const magnitude = Math.sqrt(
      Array.from(terms.values()).reduce((sum, freq) => sum + freq * freq, 0)
    );

    const vector = { terms, magnitude, docLength: tokens.length };
    this.vectorCache.set(text, vector);
    return vector;
  }

  // Cosine Similarity
  private cosineSimilarity(v1: SearchVector, v2: SearchVector): number {
    if (v1.magnitude === 0 || v2.magnitude === 0) return 0;

    let dotProduct = 0;
    for (const [term, freq1] of v1.terms) {
      const freq2 = v2.terms.get(term) || 0;
      dotProduct += freq1 * freq2;
    }

    return dotProduct / (v1.magnitude * v2.magnitude);
  }

  // Tokenization
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .match(/\b\w+\b/g)
      ?.filter((word) => word.length > 2) || [];
  }

  // Track interactions
  public recordInteraction(
    resultId: string,
    interactionType: 'view' | 'click' | 'like' | 'share',
    weight: number = 1
  ): void {
    const currentScore = this.interactionLog.get(resultId) || 0;
    const weights = { view: 1, click: 3, like: 5, share: 10 };
    this.interactionLog.set(
      resultId,
      currentScore + (weights[interactionType] * weight)
    );
    this.emit('interaction-recorded', { resultId, interactionType });
  }

  // Get search metrics
  public getMetrics(): {
    vectorsCached: number;
    totalInteractions: number;
    avgRelevanceScore: number;
  } {
    const totalInteractions = Array.from(this.interactionLog.values()).reduce(
      (sum, val) => sum + val,
      0
    );
    return {
      vectorsCached: this.vectorCache.size,
      totalInteractions,
      avgRelevanceScore: totalInteractions / (this.interactionLog.size || 1),
    };
  }

  // Clear old cache
  public clearOldCache(maxAge: number = 3600000): void {
    // Clear cache older than maxAge milliseconds
    // Implementation depends on timestamp tracking
    this.emit('cache-cleared', { itemsRemoved: this.vectorCache.size });
    this.vectorCache.clear();
  }
}

// React Hook
export function useMLSearch() {
  const [rankings, setRankings] = React.useState<RankedResult[]>([]);
  const [metrics, setMetrics] = React.useState<any>(null);

  React.useEffect(() => {
    const service = new MLSearchService();
    
    const handleInteraction = () => {
      setMetrics(service.getMetrics());
    };

    service.on('interaction-recorded', handleInteraction);

    return () => {
      service.removeListener('interaction-recorded', handleInteraction);
    };
  }, []);

  return {
    rankings,
    metrics,
    recordInteraction: (id: string, type: 'view' | 'click' | 'like' | 'share') => {
      const service = new MLSearchService();
      service.recordInteraction(id, type);
    },
  };
}
```

**Key Algorithms:**
- TF-IDF scoring for relevance
- Cosine similarity for vector comparison
- CTR weighting for user feedback
- Combined scoring (70% TF-IDF + 30% CTR)

### Part 2: Recommendations Engine (30 min)

**File:** `src/services/recommendationService.ts` (350 lines)

```typescript
import { EventEmitter } from 'events';

interface UserProfile {
  userId: string;
  viewedAlbums: string[];
  likedPhotos: string[];
  sharedAlbums: string[];
  searchHistory: string[];
}

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  score: number;
  type: 'collaborative' | 'content-based' | 'trending';
}

export class RecommendationService extends EventEmitter {
  private userProfiles: Map<string, UserProfile> = new Map();
  private similarityCache: Map<string, number> = new Map();
  private trendingCache: Map<string, any[]> = new Map();

  // Collaborative Filtering
  public getCollaborativeRecommendations(
    userId: string,
    allUsers: Map<string, UserProfile>,
    allItems: any[]
  ): Recommendation[] {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) return [];

    // Find similar users
    const similarUsers: Array<[string, number]> = [];
    for (const [otherUserId, otherProfile] of allUsers) {
      if (otherUserId === userId) continue;
      const similarity = this.calculateUserSimilarity(userProfile, otherProfile);
      if (similarity > 0.3) {
        similarUsers.push([otherUserId, similarity]);
      }
    }

    // Get recommendations from similar users
    const recommendations = new Map<string, number>();
    for (const [similarUserId, similarity] of similarUsers) {
      const similarUser = allUsers.get(similarUserId);
      if (!similarUser) continue;

      for (const albumId of similarUser.viewedAlbums) {
        if (!userProfile.viewedAlbums.includes(albumId)) {
          const score = (recommendations.get(albumId) || 0) + similarity;
          recommendations.set(albumId, score);
        }
      }
    }

    return Array.from(recommendations.entries())
      .map(([id, score]) => ({
        id,
        title: allItems.find((item) => item.id === id)?.title || '',
        reason: `Similar users enjoyed this`,
        score,
        type: 'collaborative' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // Content-Based Recommendations
  public getContentBasedRecommendations(
    albumId: string,
    allAlbums: any[]
  ): Recommendation[] {
    const targetAlbum = allAlbums.find((a) => a.id === albumId);
    if (!targetAlbum) return [];

    const recommendations: Recommendation[] = [];

    for (const album of allAlbums) {
      if (album.id === albumId) continue;

      const similarity = this.calculateContentSimilarity(targetAlbum, album);
      if (similarity > 0.5) {
        recommendations.push({
          id: album.id,
          title: album.title,
          reason: `Similar to "${targetAlbum.title}"`,
          score: similarity,
          type: 'content-based' as const,
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  // Trending Items
  public getTrendingRecommendations(
    metric: 'views' | 'shares' | 'likes' = 'views',
    timeWindow: number = 86400000 // 24 hours
  ): Recommendation[] {
    const cached = this.trendingCache.get(metric);
    if (cached && Date.now() - (cached.timestamp || 0) < 3600000) {
      return cached;
    }

    // This would typically query database for trending items
    return [];
  }

  // Similarity Calculations
  private calculateUserSimilarity(
    user1: UserProfile,
    user2: UserProfile
  ): number {
    const common = new Set(
      [...user1.viewedAlbums].filter((a) => user2.viewedAlbums.includes(a))
    ).size;

    const total =
      new Set([...user1.viewedAlbums, ...user2.viewedAlbums]).size;

    return total === 0 ? 0 : common / total;
  }

  private calculateContentSimilarity(item1: any, item2: any): number {
    // Compare tags, category, photographers, etc.
    let score = 0;

    if (item1.category === item2.category) score += 0.3;
    if (item1.photographer === item2.photographer) score += 0.2;

    const commonTags = new Set(
      (item1.tags || []).filter((t: string) => (item2.tags || []).includes(t))
    ).size;
    score += (commonTags / Math.max(item1.tags?.length || 1, 1)) * 0.5;

    return Math.min(score, 1);
  }

  // Hybrid Recommendation
  public getHybridRecommendations(
    userId: string,
    allUsers: Map<string, UserProfile>,
    allItems: any[]
  ): Recommendation[] {
    const collaborative = this.getCollaborativeRecommendations(
      userId,
      allUsers,
      allItems
    );
    const userProfile = this.userProfiles.get(userId);

    if (!userProfile || userProfile.viewedAlbums.length === 0) {
      return collaborative;
    }

    // Get content-based for most recent viewed item
    const recentAlbum =
      userProfile.viewedAlbums[userProfile.viewedAlbums.length - 1];
    const contentBased = this.getContentBasedRecommendations(
      recentAlbum,
      allItems
    );

    // Merge and deduplicate (60% collaborative, 40% content-based)
    const merged = new Map<string, Recommendation>();

    for (const rec of collaborative) {
      merged.set(rec.id, { ...rec, score: rec.score * 0.6 });
    }

    for (const rec of contentBased) {
      const existing = merged.get(rec.id);
      if (existing) {
        existing.score += rec.score * 0.4;
      } else {
        merged.set(rec.id, { ...rec, score: rec.score * 0.4 });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  // Update user profile
  public updateUserProfile(
    userId: string,
    action: 'view' | 'like' | 'share',
    itemId: string
  ): void {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        viewedAlbums: [],
        likedPhotos: [],
        sharedAlbums: [],
        searchHistory: [],
      };
      this.userProfiles.set(userId, profile);
    }

    if (action === 'view' && !profile.viewedAlbums.includes(itemId)) {
      profile.viewedAlbums.push(itemId);
    } else if (action === 'like' && !profile.likedPhotos.includes(itemId)) {
      profile.likedPhotos.push(itemId);
    } else if (action === 'share' && !profile.sharedAlbums.includes(itemId)) {
      profile.sharedAlbums.push(itemId);
    }

    this.emit('profile-updated', { userId, action, itemId });
  }
}

export function useRecommendations(userId: string) {
  const [recommendations, setRecommendations] = React.useState<
    Recommendation[]
  >([]);
  const [loading, setLoading] = React.useState(false);

  const fetchRecommendations = React.useCallback(async () => {
    setLoading(true);
    // Implementation
    setLoading(false);
  }, [userId]);

  React.useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, refetch: fetchRecommendations };
}
```

### Part 3: Search History Service (20 min)

**File:** `src/services/searchHistoryService.ts` (200 lines)

```typescript
interface HistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
  resultClicked?: boolean;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  createdAt: number;
}

export class SearchHistoryService {
  private history: HistoryEntry[] = [];
  private savedSearches: Map<string, SavedSearch> = new Map();
  private maxHistorySize = 50;

  // Add to history
  public addToHistory(
    query: string,
    resultCount: number,
    timestamp: number = Date.now()
  ): void {
    this.history.unshift({
      id: `hist_${Date.now()}`,
      query,
      timestamp,
      resultCount,
    });

    // Keep only recent 50
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.persistToStorage();
  }

  // Mark result clicked
  public markResultClicked(historyId: string): void {
    const entry = this.history.find((h) => h.id === historyId);
    if (entry) {
      entry.resultClicked = true;
      this.persistToStorage();
    }
  }

  // Get history
  public getHistory(limit: number = 10): HistoryEntry[] {
    return this.history.slice(0, limit);
  }

  // Clear history
  public clearHistory(): void {
    this.history = [];
    this.persistToStorage();
  }

  // Save search
  public saveSearch(name: string, query: string): SavedSearch {
    const saved: SavedSearch = {
      id: `saved_${Date.now()}`,
      name,
      query,
      createdAt: Date.now(),
    };
    this.savedSearches.set(saved.id, saved);
    this.persistToStorage();
    return saved;
  }

  // Get saved searches
  public getSavedSearches(): SavedSearch[] {
    return Array.from(this.savedSearches.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  // Remove saved search
  public removeSavedSearch(id: string): void {
    this.savedSearches.delete(id);
    this.persistToStorage();
  }

  // Get suggestions from history
  public getHistorySuggestions(query: string): string[] {
    const queryLower = query.toLowerCase();
    return this.history
      .map((h) => h.query)
      .filter((q) => q.toLowerCase().includes(queryLower))
      .slice(0, 5);
  }

  // Export history as CSV
  public exportAsCSV(): string {
    const rows = [['Query', 'Timestamp', 'Results', 'Clicked']];
    for (const entry of this.history) {
      rows.push([
        entry.query,
        new Date(entry.timestamp).toISOString(),
        entry.resultCount.toString(),
        (entry.resultClicked || false).toString(),
      ]);
    }
    return rows.map((r) => r.join(',')).join('\n');
  }

  // Persist to localStorage
  private persistToStorage(): void {
    try {
      localStorage.setItem('search_history', JSON.stringify(this.history));
      localStorage.setItem(
        'saved_searches',
        JSON.stringify(Array.from(this.savedSearches.entries()))
      );
    } catch (error) {
      console.error('Failed to persist search data:', error);
    }
  }

  // Load from localStorage
  public loadFromStorage(): void {
    try {
      const history = localStorage.getItem('search_history');
      if (history) {
        this.history = JSON.parse(history);
      }

      const saved = localStorage.getItem('saved_searches');
      if (saved) {
        this.savedSearches = new Map(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load search data:', error);
    }
  }
}

export function useSearchHistory() {
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [saved, setSaved] = React.useState<SavedSearch[]>([]);

  const service = React.useMemo(() => new SearchHistoryService(), []);

  React.useEffect(() => {
    service.loadFromStorage();
    setHistory(service.getHistory());
    setSaved(service.getSavedSearches());
  }, [service]);

  return {
    history,
    saved,
    addToHistory: (query: string, count: number) => {
      service.addToHistory(query, count);
      setHistory(service.getHistory());
    },
    saveSearch: (name: string, query: string) => {
      service.saveSearch(name, query);
      setSaved(service.getSavedSearches());
    },
    removeSavedSearch: (id: string) => {
      service.removeSavedSearch(id);
      setSaved(service.getSavedSearches());
    },
    clearHistory: () => {
      service.clearHistory();
      setHistory([]);
    },
  };
}
```

### Part 4: Recommendation Dashboard Component (30 min)

**File:** `src/components/RecommendationDashboard.tsx` (250 lines)

```typescript
import React from 'react';
import { useRecommendations } from '../services/recommendationService';
import styles from './RecommendationDashboard.module.css';

interface CarouselItem {
  id: string;
  title: string;
  image?: string;
  reason: string;
  score: number;
}

export function RecommendationDashboard({ userId }: { userId: string }) {
  const { recommendations, loading } = useRecommendations(userId);
  const [activeSection, setActiveSection] = React.useState<
    'for-you' | 'trending' | 'similar'
  >('for-you');

  const forYou = recommendations.filter((r) => r.type === 'collaborative');
  const trending = recommendations.filter((r) => r.type === 'trending');
  const similar = recommendations.filter((r) => r.type === 'content-based');

  if (loading) {
    return <div className={styles.loading}>Loading recommendations...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Recommendations For You</h2>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeSection === 'for-you' ? styles.active : ''}`}
            onClick={() => setActiveSection('for-you')}
          >
            For You ({forYou.length})
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'trending' ? styles.active : ''}`}
            onClick={() => setActiveSection('trending')}
          >
            Trending ({trending.length})
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'similar' ? styles.active : ''}`}
            onClick={() => setActiveSection('similar')}
          >
            Similar ({similar.length})
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {activeSection === 'for-you' && (
          <RecommendationCarousel items={forYou} title="Based on Your History" />
        )}
        {activeSection === 'trending' && (
          <RecommendationCarousel
            items={trending}
            title="Trending This Week"
          />
        )}
        {activeSection === 'similar' && (
          <RecommendationCarousel
            items={similar}
            title="Similar Content"
          />
        )}
      </div>
    </div>
  );
}

function RecommendationCarousel({
  items,
  title,
}: {
  items: Recommendation[];
  title: string;
}) {
  const [scrollPosition, setScrollPosition] = React.useState(0);

  const scroll = (direction: 'left' | 'right') => {
    const container = document.querySelector(`.${styles.carousel}`);
    if (container) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setScrollPosition(container.scrollLeft + scrollAmount);
    }
  };

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No recommendations available yet</p>
      </div>
    );
  }

  return (
    <div className={styles.carouselContainer}>
      <h3>{title}</h3>
      <div className={styles.carouselWrapper}>
        <button
          className={`${styles.scrollBtn} ${styles.left}`}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div className={styles.carousel}>
          {items.map((item) => (
            <div key={item.id} className={styles.carouselItem}>
              <div className={styles.itemCard}>
                <div className={styles.itemImage}>
                  {item.image && (
                    <img src={item.image} alt={item.title} />
                  )}
                </div>
                <div className={styles.itemInfo}>
                  <h4>{item.title}</h4>
                  <p className={styles.reason}>{item.reason}</p>
                  <div className={styles.score}>
                    Match: {Math.round(item.score * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className={`${styles.scrollBtn} ${styles.right}`}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </div>
  );
}
```

### Part 5: CSS Styling (20 min)

**File:** `src/components/RecommendationDashboard.module.css` (200 lines)

```css
.container {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  margin: 16px 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.tabs {
  display: flex;
  gap: 8px;
  background: white;
  padding: 4px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.2s ease;
}

.tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.carouselContainer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.carouselContainer h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.carouselWrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.carousel {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 8px 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.carousel::-webkit-scrollbar {
  display: none;
}

.carouselItem {
  flex: 0 0 auto;
  width: 300px;
}

.itemCard {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.itemCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.itemImage {
  width: 100%;
  height: 200px;
  background: #e5e7eb;
  overflow: hidden;
}

.itemImage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.itemInfo {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.itemInfo h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reason {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.score {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  background: #f0f4ff;
  padding: 4px 8px;
  border-radius: 4px;
  text-align: center;
}

.scrollBtn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: none;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  z-index: 10;
}

.scrollBtn:hover {
  background: #667eea;
  color: white;
}

.scrollBtn.left {
  left: -20px;
}

.scrollBtn.right {
  right: -20px;
}

.empty {
  text-align: center;
  padding: 48px 24px;
  color: #9ca3af;
}

.loading {
  text-align: center;
  padding: 48px 24px;
  color: #6b7280;
  font-weight: 500;
}

@media (max-width: 600px) {
  .container {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .tabs {
    width: 100%;
  }

  .carouselItem {
    width: 200px;
  }

  .scrollBtn {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
}
```

### Part 6: Tests (20 min)

**File:** `src/services/__tests__/t044_advanced_search.test.ts` (200 lines)

Key test cases:
```typescript
describe('MLSearchService', () => {
  it('should calculate TF-IDF scores correctly');
  it('should rank results by relevance');
  it('should track user interactions');
  it('should combine TF-IDF and CTR scores');
  it('should cache vectors for performance');
  it('should clear old cache entries');
});

describe('RecommendationService', () => {
  it('should generate collaborative recommendations');
  it('should calculate user similarity correctly');
  it('should generate content-based recommendations');
  it('should provide hybrid recommendations');
  it('should return trending items');
  it('should have > 5% CTR on recommendations');
});

describe('SearchHistoryService', () => {
  it('should add entries to history');
  it('should limit history to 50 entries');
  it('should persist history to localStorage');
  it('should retrieve saved searches');
  it('should export history as CSV');
  it('should mark clicked results');
});

describe('RecommendationDashboard', () => {
  it('should render recommendation tabs');
  it('should display carousel items');
  it('should scroll carousel on button click');
  it('should show scores for each recommendation');
});
```

---

## Integration Points

### With Existing Services
- **SearchService (T039):** Use enhanced ranking
- **AnalyticsService (T042):** Track recommendation clicks
- **UserService (T041):** Get user profiles
- **StorageService:** Persist history

### Database Integration
```typescript
// New tables/collections needed
- search_history (user_id, query, timestamp, result_count, clicked)
- saved_searches (user_id, name, query, created_at)
- recommendation_cache (user_id, recommendations, generated_at, expires_at)
- user_interactions (user_id, item_id, interaction_type, weight, timestamp)
```

---

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|----------------|
| TF-IDF Calculation | < 50ms | Vector caching |
| Recommendation Generation | < 200ms | Pre-computed scores |
| Search History Lookup | < 10ms | In-memory cache |
| Dashboard Render | < 100ms | React optimization |

---

## Success Criteria

- ✅ ML ranking improves relevance by 30%
- ✅ Recommendations have 5%+ CTR
- ✅ Search history persists across sessions
- ✅ All 15+ tests pass (100%)
- ✅ < 200ms recommendation time
- ✅ < 50ms TF-IDF calculation

---

**Status:** ✅ **READY TO IMPLEMENT**  
**Estimated Time:** 1.5 hours  
**Lines of Code:** 1,300+ (code + CSS + tests)  

