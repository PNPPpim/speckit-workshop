/**
 * Recommendation Service - Hybrid Recommendation Engine
 * 
 * Implements multiple recommendation algorithms:
 * - Collaborative filtering (user-based similarity)
 * - Content-based recommendations (tag/category matching)
 * - Hybrid approach combining both methods
 */

interface UserProfile {
  userId: string;
  viewedAlbums: Set<string>;
  ratings: Map<string, number>;
  preferences: Map<string, number>;
}

interface Album {
  id: string;
  title: string;
  tags: string[];
  category: string;
  photographer: string;
}

interface Recommendation {
  albumId: string;
  score: number;
  reason: string;
  algorithm: 'collaborative' | 'content-based' | 'hybrid';
}

class RecommendationService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private albums: Map<string, Album> = new Map();
  private similarityCache: Map<string, number> = new Map();

  /**
   * Register an album in the system
   */
  registerAlbum(album: Album): void {
    this.albums.set(album.id, album);
  }

  /**
   * Get or create user profile
   */
  private getOrCreateProfile(userId: string): UserProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        userId,
        viewedAlbums: new Set(),
        ratings: new Map(),
        preferences: new Map(),
      });
    }
    return this.userProfiles.get(userId)!;
  }

  /**
   * Record user viewing an album
   */
  recordView(userId: string, albumId: string): void {
    const profile = this.getOrCreateProfile(userId);
    profile.viewedAlbums.add(albumId);
    this.updateUserPreferences(userId, albumId);
  }

  /**
   * Record user rating an album
   */
  recordRating(userId: string, albumId: string, rating: number): void {
    const profile = this.getOrCreateProfile(userId);
    profile.ratings.set(albumId, Math.min(5, Math.max(1, rating)));
    this.similarityCache.clear(); // Invalidate cache
  }

  /**
   * Update user preferences based on viewed album
   */
  private updateUserPreferences(userId: string, albumId: string): void {
    const profile = this.getOrCreateProfile(userId);
    const album = this.albums.get(albumId);

    if (!album) return;

    // Update tag preferences
    album.tags.forEach((tag) => {
      const count = profile.preferences.get(tag) || 0;
      profile.preferences.set(tag, count + 1);
    });

    // Update category preference
    const categoryCount = profile.preferences.get(album.category) || 0;
    profile.preferences.set(album.category, categoryCount + 0.5);
  }

  /**
   * Calculate Jaccard similarity between two albums
   */
  private calculateAlbumSimilarity(albumId1: string, albumId2: string): number {
    const cacheKey = `${albumId1}:${albumId2}`;
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey)!;
    }

    const album1 = this.albums.get(albumId1);
    const album2 = this.albums.get(albumId2);

    if (!album1 || !album2) {
      return 0;
    }

    const tags1 = new Set(album1.tags);
    const tags2 = new Set(album2.tags);

    const intersection = new Set([...tags1].filter((x) => tags2.has(x)));
    const union = new Set([...tags1, ...tags2]);

    let similarity = intersection.size / (union.size || 1);

    // Add category similarity (40% weight)
    if (album1.category === album2.category) {
      similarity = similarity * 0.6 + 0.4;
    } else {
      similarity = similarity * 0.6;
    }

    // Add photographer similarity (10% weight)
    if (album1.photographer === album2.photographer) {
      similarity += 0.1;
    }

    this.similarityCache.set(cacheKey, similarity);
    return similarity;
  }

  /**
   * Calculate user similarity (cosine similarity based on preferences)
   */
  private calculateUserSimilarity(userId1: string, userId2: string): number {
    const profile1 = this.userProfiles.get(userId1);
    const profile2 = this.userProfiles.get(userId2);

    if (!profile1 || !profile2) {
      return 0;
    }

    const allPrefs = new Set([
      ...profile1.preferences.keys(),
      ...profile2.preferences.keys(),
    ]);

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    allPrefs.forEach((pref) => {
      const val1 = profile1.preferences.get(pref) || 0;
      const val2 = profile2.preferences.get(pref) || 0;

      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    });

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * Get collaborative filtering recommendations
   */
  getCollaborativeRecommendations(userId: string, limit: number = 5): Recommendation[] {
    const profile = this.getOrCreateProfile(userId);
    const recommendations = new Map<string, number>();

    // Find similar users
    const similarUsers: { userId: string; similarity: number }[] = [];
    this.userProfiles.forEach((_, otherUserId) => {
      if (otherUserId !== userId) {
        const similarity = this.calculateUserSimilarity(userId, otherUserId);
        if (similarity > 0.1) {
          similarUsers.push({ userId: otherUserId, similarity });
        }
      }
    });

    // Get albums from similar users that current user hasn't seen
    similarUsers.forEach(({ userId: similarUserId, similarity }) => {
      const similarProfile = this.userProfiles.get(similarUserId)!;
      similarProfile.viewedAlbums.forEach((albumId) => {
        if (!profile.viewedAlbums.has(albumId)) {
          const score = recommendations.get(albumId) || 0;
          recommendations.set(albumId, score + similarity);
        }
      });
    });

    return Array.from(recommendations.entries())
      .map(([albumId, score]) => ({
        albumId,
        score,
        reason: 'Users like you enjoyed this',
        algorithm: 'collaborative' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get content-based recommendations
   */
  getContentBasedRecommendations(userId: string, limit: number = 5): Recommendation[] {
    const profile = this.getOrCreateProfile(userId);
    const recommendations = new Map<string, number>();

    profile.viewedAlbums.forEach((viewedAlbumId) => {
      this.albums.forEach((_, albumId) => {
        if (!profile.viewedAlbums.has(albumId)) {
          const similarity = this.calculateAlbumSimilarity(viewedAlbumId, albumId);
          if (similarity > 0) {
            const score = recommendations.get(albumId) || 0;
            recommendations.set(albumId, score + similarity);
          }
        }
      });
    });

    // Add tag-based recommendations
    profile.preferences.forEach((prefCount, tag) => {
      this.albums.forEach((album, albumId) => {
        if (!profile.viewedAlbums.has(albumId)) {
          if (album.tags.includes(tag)) {
            const score = recommendations.get(albumId) || 0;
            recommendations.set(albumId, score + prefCount * 0.5);
          }
        }
      });
    });

    return Array.from(recommendations.entries())
      .map(([albumId, score]) => ({
        albumId,
        score: Math.min(5, score / 10),
        reason: 'Similar to albums you like',
        algorithm: 'content-based' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get hybrid recommendations (60% collaborative, 40% content-based)
   */
  getHybridRecommendations(userId: string, limit: number = 5): Recommendation[] {
    const collaborative = this.getCollaborativeRecommendations(userId, limit * 2);
    const contentBased = this.getContentBasedRecommendations(userId, limit * 2);

    const combined = new Map<string, { score: number; reason: string }>();

    // Add collaborative recommendations (60% weight)
    collaborative.forEach(({ albumId, score, reason }) => {
      const current = combined.get(albumId);
      const newScore = (current?.score || 0) + score * 0.6;
      combined.set(albumId, {
        score: newScore,
        reason: current?.reason || reason,
      });
    });

    // Add content-based recommendations (40% weight)
    contentBased.forEach(({ albumId, score, reason }) => {
      const current = combined.get(albumId);
      const newScore = (current?.score || 0) + score * 0.4;
      combined.set(albumId, {
        score: newScore,
        reason: current?.reason || reason,
      });
    });

    return Array.from(combined.entries())
      .map(([albumId, { score, reason }]) => ({
        albumId,
        score,
        reason,
        algorithm: 'hybrid' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get trending recommendations
   */
  getTrendingRecommendations(limit: number = 5): Recommendation[] {
    const trendingScore = new Map<string, number>();

    this.userProfiles.forEach((profile) => {
      profile.viewedAlbums.forEach((albumId) => {
        const score = trendingScore.get(albumId) || 0;
        trendingScore.set(albumId, score + 1);
      });
    });

    return Array.from(trendingScore.entries())
      .map(([albumId, score]) => ({
        albumId,
        score: Math.min(5, score / this.userProfiles.size),
        reason: 'Trending now',
        algorithm: 'hybrid' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.similarityCache.clear();
  }
}

export default new RecommendationService();
