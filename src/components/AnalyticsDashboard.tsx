import { useState, useEffect } from 'react';
import { AnalyticsService, UserStats, AlbumStats, UsageQuota } from '../services/analyticsService';
import styles from './AnalyticsDashboard.module.css';

/**
 * Analytics Dashboard Component
 */
export function AnalyticsDashboard() {
  const [analyticsService] = useState(() => new AnalyticsService());
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [quota, setQuota] = useState<UsageQuota | null>(null);
  const [topAlbums, setTopAlbums] = useState<AlbumStats[]>([]);
  const [trends, setTrends] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    loadDashboardData();
  }, [activePeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = await analyticsService.getUserStats('current-user');
      if (stats) setUserStats(stats);

      const q = await analyticsService.getUsageQuota();
      if (q) setQuota(q);

      const albums = await analyticsService.getTopAlbums(5);
      setTopAlbums(albums);

      const trendData = await analyticsService.getTrends('views', activePeriod === 'day' ? 7 : activePeriod === 'week' ? 30 : 90);
      setTrends(trendData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await analyticsService.exportStatsAsCSV();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading analytics...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics Dashboard</h1>
        <button className={styles.exportButton} onClick={handleExport}>
          📥 Export Data
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Period Selector */}
      <div className={styles.periodSelector}>
        {(['day', 'week', 'month'] as const).map((period) => (
          <button
            key={period}
            className={`${styles.periodButton} ${activePeriod === period ? styles.active : ''}`}
            onClick={() => setActivePeriod(period)}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      {userStats && (
        <div className={styles.metricsGrid}>
          <MetricCard title="Albums Created" value={userStats.totalAlbumsCreated} icon="📚" />
          <MetricCard title="Photos Uploaded" value={userStats.totalPhotosUploaded} icon="📸" />
          <MetricCard title="Photos Viewed" value={userStats.totalPhotosViewed} icon="👁️" />
          <MetricCard title="Photos Shared" value={userStats.totalPhotosShared} icon="🔗" />
          <MetricCard title="Total Logins" value={userStats.totalLoginCount} icon="🔓" />
          <MetricCard
            title="Avg. Session"
            value={`${Math.round(userStats.averageSessionDuration / 1000)}s`}
            icon="⏱️"
          />
        </div>
      )}

      {/* Storage Quota */}
      {quota && (
        <div className={styles.quotaContainer}>
          <h2 className={styles.sectionTitle}>Storage Usage</h2>
          <div className={styles.quotaContent}>
            <div className={styles.quotaBar}>
              <div
                className={styles.quotaFill}
                style={{ width: `${quota.percentageUsed}%` }}
              />
            </div>
            <p className={styles.quotaText}>
              {Math.round(quota.storageUsed / 1024 / 1024)} MB of{' '}
              {Math.round(quota.storageLimit / 1024 / 1024 / 1024)} GB
              ({quota.percentageUsed}% used)
            </p>
            {quota.percentageUsed > 80 && (
              <p className={styles.quotaWarning}>
                ⚠️ Storage usage is high. Consider deleting old photos or upgrading your plan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Albums */}
      {topAlbums.length > 0 && (
        <div className={styles.topAlbumsContainer}>
          <h2 className={styles.sectionTitle}>Top Albums by Views</h2>
          <div className={styles.albumsList}>
            {topAlbums.map((album, index) => (
              <div key={album.albumId} className={styles.albumRow}>
                <span className={styles.rank}>#{index + 1}</span>
                <div className={styles.albumInfo}>
                  <p className={styles.albumName}>{album.name}</p>
                  <p className={styles.albumMeta}>
                    {album.photosCount} photos • {album.viewsCount} views
                  </p>
                </div>
                <span className={styles.viewCount}>{album.viewsCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Chart */}
      {trends.length > 0 && (
        <div className={styles.trendsContainer}>
          <h2 className={styles.sectionTitle}>View Trends ({activePeriod})</h2>
          <div className={styles.chart}>
            <SimpleBarChart data={trends} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricIcon}>{icon}</span>
      <h3 className={styles.metricTitle}>{title}</h3>
      <p className={styles.metricValue}>{value}</p>
    </div>
  );
}

/**
 * Simple Bar Chart Component
 */
function SimpleBarChart({ data }: { data: number[] }) {
  const maxValue = Math.max(...data, 1);
  const normalizedData = data.map((v) => (v / maxValue) * 100);

  return (
    <div className={styles.barChart}>
      {normalizedData.map((height, index) => (
        <div key={index} className={styles.barContainer}>
          <div className={styles.bar} style={{ height: `${height}%` }} />
          <span className={styles.barLabel}>{index}</span>
        </div>
      ))}
    </div>
  );
}
