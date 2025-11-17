import {
  AnalyticsService,
  AnalyticsEventType,
  UserStats,
  AlbumStats,
  TimeReport,
  UsageQuota,
} from '../analyticsService';

global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    mockFetch.mockClear();
  });

  afterEach(() => {
    analyticsService.destroy();
  });

  describe('Event Tracking', () => {
    it('should track analytics events', () => {
      const listener = jest.fn();
      analyticsService.on('event-tracked', listener);

      analyticsService.trackEvent(AnalyticsEventType.ALBUM_CREATED, { albumId: 'album-1' });

      expect(listener).toHaveBeenCalled();
    });

    it('should track album creation', () => {
      const listener = jest.fn();
      analyticsService.on('event-tracked', listener);

      analyticsService.trackAlbumCreated('album-1', 'My Album');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            type: AnalyticsEventType.ALBUM_CREATED,
          }),
        })
      );
    });

    it('should track album views', () => {
      const listener = jest.fn();
      analyticsService.on('event-tracked', listener);

      analyticsService.trackAlbumViewed('album-1', 5000);

      expect(listener).toHaveBeenCalled();
    });

    it('should track photo uploads', () => {
      const listener = jest.fn();
      analyticsService.on('event-tracked', listener);

      analyticsService.trackPhotoUploaded('album-1', 1024000);

      expect(listener).toHaveBeenCalled();
    });

    it('should track photo views', () => {
      const listener = jest.fn();
      analyticsService.on('event-tracked', listener);

      analyticsService.trackPhotoViewed('album-1', 'photo-1');

      expect(listener).toHaveBeenCalled();
    });

    it('should track user login', () => {
      const listener = jest.fn();
      analyticsService.on('event-tracked', listener);

      analyticsService.trackUserLogin();

      expect(listener).toHaveBeenCalled();
    });

    it('should queue events and auto-flush on batch size', (done) => {
      const flushListener = jest.fn();
      analyticsService.on('batch-flushed', flushListener);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      // Fill the batch
      for (let i = 0; i < 50; i++) {
        analyticsService.trackEvent(AnalyticsEventType.PHOTO_VIEWED, { photoId: `photo-${i}` });
      }

      setTimeout(() => {
        expect(flushListener).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('User Statistics', () => {
    it('should get user statistics', async () => {
      const mockStats: UserStats = {
        userId: 'user-1',
        totalAlbumsCreated: 5,
        totalPhotosUploaded: 100,
        totalPhotosViewed: 500,
        totalPhotosShared: 50,
        totalLoginCount: 25,
        lastLogin: '2024-01-01T12:00:00Z',
        firstLogin: '2024-01-01T00:00:00Z',
        averageSessionDuration: 300000,
        storageUsed: 1024000000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      } as any);

      const stats = await analyticsService.getUserStats('user-1');
      expect(stats).toEqual(mockStats);
    });

    it('should handle user stats fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as any);

      const stats = await analyticsService.getUserStats('user-1');
      expect(stats).toBeNull();
    });
  });

  describe('Album Statistics', () => {
    it('should get album statistics', async () => {
      const mockStats: AlbumStats = {
        albumId: 'album-1',
        ownerId: 'user-1',
        name: 'My Album',
        photosCount: 50,
        viewsCount: 500,
        sharesCount: 10,
        lastModified: '2024-01-01T12:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        averagePhotoSize: 2048000,
        totalStorageUsed: 102400000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      } as any);

      const stats = await analyticsService.getAlbumStats('album-1');
      expect(stats).toEqual(mockStats);
    });

    it('should get top albums by views', async () => {
      const mockAlbums: AlbumStats[] = [
        {
          albumId: 'album-1',
          ownerId: 'user-1',
          name: 'Album 1',
          photosCount: 50,
          viewsCount: 1000,
          sharesCount: 20,
          lastModified: '2024-01-01T12:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          averagePhotoSize: 2048000,
          totalStorageUsed: 102400000,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbums,
      } as any);

      const albums = await analyticsService.getTopAlbums(10);
      expect(albums).toEqual(mockAlbums);
    });
  });

  describe('Usage Quota', () => {
    it('should get usage quota', async () => {
      const mockQuota: UsageQuota = {
        userId: 'user-1',
        storageLimit: 107374182400, // 100GB
        storageUsed: 10737418240, // 10GB
        percentageUsed: 10,
        bandwidthLimit: 1099511627776, // 1TB
        bandwidthUsed: 109951162777, // ~100GB
        daysRemainingInBillingCycle: 15,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuota,
      } as any);

      const quota = await analyticsService.getUsageQuota();
      expect(quota).toEqual(mockQuota);
    });

    it('should emit quota warning when usage is high', (done) => {
      const mockQuota: UsageQuota = {
        userId: 'user-1',
        storageLimit: 107374182400,
        storageUsed: 85899345920, // 80GB = 80%
        percentageUsed: 80,
        bandwidthLimit: 1099511627776,
        bandwidthUsed: 879609302222,
        daysRemainingInBillingCycle: 15,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuota,
      } as any);

      const warningListener = jest.fn();
      analyticsService.on('quota-warning', warningListener);

      analyticsService.getUsageQuota().then(() => {
        expect(warningListener).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Reports', () => {
    it('should get time-based report', async () => {
      const mockReport: TimeReport = {
        period: 'week',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-07T23:59:59Z',
        totalEvents: 1000,
        eventsPerType: {
          [AnalyticsEventType.ALBUM_CREATED]: 5,
          [AnalyticsEventType.ALBUM_VIEWED]: 100,
          [AnalyticsEventType.PHOTO_UPLOADED]: 50,
          [AnalyticsEventType.PHOTO_VIEWED]: 800,
          [AnalyticsEventType.PHOTO_DOWNLOADED]: 30,
          [AnalyticsEventType.PHOTO_DELETED]: 5,
          [AnalyticsEventType.ALBUM_SHARED]: 10,
          [AnalyticsEventType.USER_REGISTERED]: 0,
          [AnalyticsEventType.USER_LOGGED_IN]: 0,
          [AnalyticsEventType.SEARCH_PERFORMED]: 0,
          [AnalyticsEventType.STORAGE_QUOTA_EXCEEDED]: 0,
        },
        newUsers: 0,
        activeUsers: 50,
        dataGenerated: 5368709120,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReport,
      } as any);

      const report = await analyticsService.getTimeReport('week');
      expect(report).toEqual(mockReport);
    });
  });

  describe('Trends', () => {
    it('should get trends data', async () => {
      const mockTrends = [100, 150, 120, 180, 200, 160, 190];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrends,
      } as any);

      const trends = await analyticsService.getTrends('views', 30);
      expect(trends).toEqual(mockTrends);
    });
  });

  describe('Activity Heatmap', () => {
    it('should get activity heatmap', async () => {
      const mockHeatmap: Record<string, number> = {
        '2024-01-01': 100,
        '2024-01-02': 150,
        '2024-01-03': 120,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHeatmap,
      } as any);

      const heatmap = await analyticsService.getActivityHeatmap();
      expect(heatmap).toEqual(mockHeatmap);
    });
  });

  describe('Export', () => {
    it('should export stats as CSV', async () => {
      const mockCSV = 'date,views,uploads\n2024-01-01,100,5';
      const blob = new Blob([mockCSV], { type: 'text/csv' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => blob,
      } as any);

      const result = await analyticsService.exportStatsAsCSV();
      expect(result).toBeTruthy();
    });
  });

  describe('Batch Processing', () => {
    it('should flush events on timer', (done) => {
      const flushListener = jest.fn();
      analyticsService.on('batch-flushed', flushListener);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      analyticsService.trackEvent(AnalyticsEventType.PHOTO_VIEWED);

      setTimeout(() => {
        analyticsService.stopBatchProcessing();
        expect(flushListener).toHaveBeenCalled();
        done();
      }, 31000);
    }, 35000); // Increase timeout for this test

    it('should handle batch errors', (done) => {
      const errorListener = jest.fn();
      analyticsService.on('batch-error', errorListener);

      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as any);

      // Fill batch to force flush
      for (let i = 0; i < 50; i++) {
        analyticsService.trackEvent(AnalyticsEventType.PHOTO_VIEWED);
      }

      setTimeout(() => {
        expect(errorListener).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Event Listeners', () => {
    it('should emit stats-loaded event', (done) => {
      const mockStats: UserStats = {
        userId: 'user-1',
        totalAlbumsCreated: 5,
        totalPhotosUploaded: 100,
        totalPhotosViewed: 500,
        totalPhotosShared: 50,
        totalLoginCount: 25,
        lastLogin: '2024-01-01T12:00:00Z',
        firstLogin: '2024-01-01T00:00:00Z',
        averageSessionDuration: 300000,
        storageUsed: 1024000000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      } as any);

      const statsListener = jest.fn();
      analyticsService.on('user-stats-loaded', statsListener);

      analyticsService.getUserStats('user-1').then(() => {
        expect(statsListener).toHaveBeenCalled();
        done();
      });
    });
  });
});
