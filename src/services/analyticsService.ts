import { EventEmitter } from 'events';

/**
 * Event Types for Analytics
 */
export enum AnalyticsEventType {
  ALBUM_CREATED = 'album_created',
  ALBUM_VIEWED = 'album_viewed',
  ALBUM_SHARED = 'album_shared',
  PHOTO_UPLOADED = 'photo_uploaded',
  PHOTO_VIEWED = 'photo_viewed',
  PHOTO_DOWNLOADED = 'photo_downloaded',
  PHOTO_DELETED = 'photo_deleted',
  USER_REGISTERED = 'user_registered',
  USER_LOGGED_IN = 'user_logged_in',
  SEARCH_PERFORMED = 'search_performed',
  STORAGE_QUOTA_EXCEEDED = 'storage_quota_exceeded',
}

/**
 * Analytics Event
 */
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  userId: string;
  timestamp: string;
  metadata: Record<string, any>;
  duration?: number; // in milliseconds
}

/**
 * User Statistics
 */
export interface UserStats {
  userId: string;
  totalAlbumsCreated: number;
  totalPhotosUploaded: number;
  totalPhotosViewed: number;
  totalPhotosShared: number;
  totalLoginCount: number;
  lastLogin: string;
  firstLogin: string;
  averageSessionDuration: number; // in milliseconds
  storageUsed: number; // in bytes
}

/**
 * Album Statistics
 */
export interface AlbumStats {
  albumId: string;
  ownerId: string;
  name: string;
  photosCount: number;
  viewsCount: number;
  sharesCount: number;
  lastModified: string;
  createdAt: string;
  averagePhotoSize: number; // in bytes
  totalStorageUsed: number; // in bytes
}

/**
 * Time Period Report
 */
export interface TimeReport {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  totalEvents: number;
  eventsPerType: Record<AnalyticsEventType, number>;
  newUsers: number;
  activeUsers: number;
  dataGenerated: number; // in bytes
}

/**
 * Usage Quota
 */
export interface UsageQuota {
  userId: string;
  storageLimit: number; // in bytes
  storageUsed: number; // in bytes
  percentageUsed: number;
  bandwidthLimit: number; // in bytes
  bandwidthUsed: number; // in bytes
  daysRemainingInBillingCycle: number;
}

/**
 * Analytics Service
 * Tracks user activity, album usage, and generates reports
 * 
 * Features:
 * - Event tracking and logging
 * - User and album statistics
 * - Usage reports by time period
 * - Storage quota tracking
 * - Trend analysis
 * - Export functionality
 * - Real-time metrics
 */
export class AnalyticsService extends EventEmitter {
  private apiBaseUrl: string;
  private authToken: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private batchSize = 50;
  private batchInterval = 30000; // 30 seconds

  constructor(apiBaseUrl: string = 'http://localhost:3001/api') {
    super();
    this.apiBaseUrl = apiBaseUrl;
    this.startBatchProcessing();
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Track an analytics event
   */
  trackEvent(type: AnalyticsEventType, metadata: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random()}`,
      type,
      userId: 'current-user', // Would be set from auth context
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.eventQueue.push(event);
    this.emit('event-tracked', { event });

    // Flush if batch is full
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  /**
   * Track album creation
   */
  trackAlbumCreated(albumId: string, name: string): void {
    this.trackEvent(AnalyticsEventType.ALBUM_CREATED, {
      albumId,
      name,
    });
  }

  /**
   * Track album view
   */
  trackAlbumViewed(albumId: string, duration: number): void {
    this.trackEvent(AnalyticsEventType.ALBUM_VIEWED, {
      albumId,
      duration,
    });
  }

  /**
   * Track photo upload
   */
  trackPhotoUploaded(albumId: string, fileSize: number): void {
    this.trackEvent(AnalyticsEventType.PHOTO_UPLOADED, {
      albumId,
      fileSize,
    });
  }

  /**
   * Track photo view
   */
  trackPhotoViewed(albumId: string, photoId: string): void {
    this.trackEvent(AnalyticsEventType.PHOTO_VIEWED, {
      albumId,
      photoId,
    });
  }

  /**
   * Track user login
   */
  trackUserLogin(): void {
    this.trackEvent(AnalyticsEventType.USER_LOGGED_IN, {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/analytics/users/${userId}/stats`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const stats = await response.json();
      this.emit('user-stats-loaded', { stats });
      return stats as UserStats;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get album statistics
   */
  async getAlbumStats(albumId: string): Promise<AlbumStats | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/analytics/albums/${albumId}/stats`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const stats = await response.json();
      this.emit('album-stats-loaded', { stats });
      return stats as AlbumStats;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get time-based report
   */
  async getTimeReport(
    period: 'day' | 'week' | 'month' | 'year',
    startDate?: string
  ): Promise<TimeReport | null> {
    try {
      const params = new URLSearchParams({ period });
      if (startDate) {
        params.append('startDate', startDate);
      }

      const response = await fetch(`${this.apiBaseUrl}/analytics/reports/time?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const report = await response.json();
      this.emit('time-report-loaded', { report });
      return report as TimeReport;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get usage quota information
   */
  async getUsageQuota(): Promise<UsageQuota | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/analytics/quota`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const quota = await response.json();
      this.emit('quota-loaded', { quota });

      if (quota.percentageUsed > 80) {
        this.emit('quota-warning', { quota });
      }

      return quota as UsageQuota;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get top albums by views
   */
  async getTopAlbums(limit: number = 10): Promise<AlbumStats[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/analytics/albums/top?limit=${limit}&sortBy=views`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        return [];
      }

      const albums = await response.json();
      this.emit('top-albums-loaded', { albums });
      return albums as AlbumStats[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get activity heatmap
   */
  async getActivityHeatmap(userId?: string): Promise<Record<string, number>> {
    try {
      const path = userId ? `/analytics/users/${userId}/heatmap` : '/analytics/heatmap';
      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return {};
      }

      const heatmap = await response.json();
      this.emit('heatmap-loaded', { heatmap });
      return heatmap;
    } catch (error) {
      return {};
    }
  }

  /**
   * Export stats as CSV
   */
  async exportStatsAsCSV(userId?: string): Promise<Blob | null> {
    try {
      const path = userId ? `/analytics/export/${userId}` : '/analytics/export';
      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      this.emit('export-completed', { format: 'csv', size: blob.size });
      return blob;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get trends analysis
   */
  async getTrends(metric: 'views' | 'uploads' | 'shares', days: number = 30): Promise<number[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/analytics/trends?metric=${metric}&days=${days}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        return [];
      }

      const trends = await response.json();
      this.emit('trends-loaded', { metric, trends });
      return trends;
    } catch (error) {
      return [];
    }
  }

  /**
   * Flush queued events to server
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = this.eventQueue.splice(0, this.batchSize);

    try {
      const response = await fetch(`${this.apiBaseUrl}/analytics/events/batch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        // Re-queue events if batch failed
        this.eventQueue.unshift(...eventsToSend);
        this.emit('batch-error', { count: eventsToSend.length });
      } else {
        this.emit('batch-flushed', { count: eventsToSend.length });
      }
    } catch (error) {
      // Re-queue events on error
      this.eventQueue.unshift(...eventsToSend);
      this.emit('batch-error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      this.flushEvents();
    }, this.batchInterval);
  }

  /**
   * Stop batch processing
   */
  stopBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    // Flush remaining events
    this.flushEvents();
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.stopBatchProcessing();
    this.removeAllListeners();
  }

  /**
   * Get request headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }
}

/**
 * React Hook for Analytics
 */
export function useAnalytics() {
  const [analyticsService] = React.useState(() => new AnalyticsService());
  const [userStats, setUserStats] = React.useState<UserStats | null>(null);
  const [quota, setQuota] = React.useState<UsageQuota | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    analyticsService.on('user-stats-loaded', ({ stats }) => {
      setUserStats(stats);
    });

    analyticsService.on('quota-loaded', ({ quota: q }) => {
      setQuota(q);
    });

    return () => {
      analyticsService.removeAllListeners();
      analyticsService.destroy();
    };
  }, [analyticsService]);

  const loadUserStats = React.useCallback(
    async (userId: string) => {
      setLoading(true);
      const stats = await analyticsService.getUserStats(userId);
      setLoading(false);
      return stats;
    },
    [analyticsService]
  );

  const loadQuota = React.useCallback(async () => {
    setLoading(true);
    const q = await analyticsService.getUsageQuota();
    setLoading(false);
    return q;
  }, [analyticsService]);

  const trackEvent = React.useCallback(
    (type: AnalyticsEventType, metadata?: Record<string, any>) => {
      analyticsService.trackEvent(type, metadata);
    },
    [analyticsService]
  );

  return {
    userStats,
    quota,
    loading,
    loadUserStats,
    loadQuota,
    trackEvent,
    analyticsService,
  };
}

import React from 'react';
