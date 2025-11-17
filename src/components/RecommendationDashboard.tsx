/**
 * Recommendation Dashboard Component
 * 
 * Displays personalized recommendations with:
 * - Multiple recommendation sections (For You, Trending, Similar)
 * - Horizontal carousel with scrolling
 * - Recommendation score display
 * - Responsive design
 */

import React, { useState, useEffect, useRef } from 'react';
import recommendationService from '../services/recommendationService';
import styles from './RecommendationDashboard.module.css';

interface RecommendationCardProps {
  albumId: string;
  title: string;
  score: number;
  reason: string;
  onViewAlbum: (albumId: string) => void;
}

interface RecommendationDashboardProps {
  userId: string;
  albums: Array<{ id: string; title: string; tags: string[]; category: string; photographer: string }>;
  onAlbumSelect: (albumId: string) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  albumId,
  title,
  score,
  reason,
  onViewAlbum,
}) => (
  <div className={styles.recommendationCard}>
    <div className={styles.cardImage}>
      <div className={styles.placeholder}>📷</div>
    </div>
    <div className={styles.cardContent}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardReason}>{reason}</p>
      <div className={styles.scoreSection}>
        <div className={styles.scoreLabel}>Match Score</div>
        <div className={styles.scoreBar}>
          <div
            className={styles.scoreProgress}
            style={{ width: `${score * 20}%` }}
          />
        </div>
        <div className={styles.scoreValue}>{(score * 100).toFixed(0)}%</div>
      </div>
    </div>
    <button
      className={styles.cardButton}
      onClick={() => onViewAlbum(albumId)}
      aria-label={`View album: ${title}`}
    >
      View
    </button>
  </div>
);

const RecommendationCarousel: React.FC<{
  recommendations: Array<{ albumId: string; score: number; reason: string }>;
  albums: Map<string, any>;
  onAlbumSelect: (albumId: string) => void;
}> = ({ recommendations, albums, onAlbumSelect }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const carousel = carouselRef.current;
    carousel?.addEventListener('scroll', checkScroll);
    return () => carousel?.removeEventListener('scroll', checkScroll);
  }, [recommendations]);

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;

    const scrollAmount = 300;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={styles.carouselContainer}>
      {canScrollLeft && (
        <button
          className={`${styles.scrollButton} ${styles.scrollLeft}`}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ←
        </button>
      )}

      <div ref={carouselRef} className={styles.carousel}>
        {recommendations.map(({ albumId, score, reason }) => {
          const album = albums.get(albumId);
          return (
            <div key={albumId} className={styles.carouselItem}>
              <RecommendationCard
                albumId={albumId}
                title={album?.title || 'Unknown Album'}
                score={Math.min(5, score)}
                reason={reason}
                onViewAlbum={onAlbumSelect}
              />
            </div>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          className={`${styles.scrollButton} ${styles.scrollRight}`}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          →
        </button>
      )}
    </div>
  );
};

const RecommendationDashboard: React.FC<RecommendationDashboardProps> = ({
  userId,
  albums,
  onAlbumSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'for-you' | 'trending' | 'similar'>('for-you');
  const [recommendations, setRecommendations] = useState<
    Array<{ albumId: string; score: number; reason: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const albumMap = new Map(albums.map((a) => [a.id, a]));

  // Register albums
  useEffect(() => {
    albums.forEach((album) => {
      recommendationService.registerAlbum({
        id: album.id,
        title: album.title,
        tags: album.tags || [],
        category: album.category || 'general',
        photographer: album.photographer || 'unknown',
      });
    });
  }, [albums]);

  // Load recommendations
  useEffect(() => {
    setLoading(true);

    const getRecommendations = () => {
      let recs;
      switch (activeTab) {
        case 'for-you':
          recs = recommendationService.getHybridRecommendations(userId, 8);
          break;
        case 'trending':
          recs = recommendationService.getTrendingRecommendations(8);
          break;
        case 'similar':
          recs = recommendationService.getContentBasedRecommendations(userId, 8);
          break;
      }

      setRecommendations(
        recs.map((r) => ({
          albumId: r.albumId,
          score: r.score,
          reason: r.reason,
        })),
      );
      setLoading(false);
    };

    // Simulate async loading
    const timer = setTimeout(getRecommendations, 100);
    return () => clearTimeout(timer);
  }, [activeTab, userId]);

  const handleViewAlbum = (albumId: string) => {
    recommendationService.recordView(userId, albumId);
    onAlbumSelect(albumId);
  };

  return (
    <div className={styles.dashboard}>
      <h2 className={styles.title}>Recommended For You</h2>

      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'for-you' ? styles.active : ''}`}
          onClick={() => setActiveTab('for-you')}
        >
          For You
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'trending' ? styles.active : ''}`}
          onClick={() => setActiveTab('trending')}
        >
          Trending
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'similar' ? styles.active : ''}`}
          onClick={() => setActiveTab('similar')}
        >
          Similar
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading recommendations...</div>
      ) : recommendations.length > 0 ? (
        <RecommendationCarousel
          recommendations={recommendations}
          albums={albumMap}
          onAlbumSelect={handleViewAlbum}
        />
      ) : (
        <div className={styles.empty}>
          No recommendations available yet. Start exploring albums!
        </div>
      )}
    </div>
  );
};

export default RecommendationDashboard;
