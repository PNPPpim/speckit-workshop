import { AuthService, AuthUser } from '../authService';
import { UserService, UserProfile, UserSettings } from '../userService';
import { ShareService, Permission, ShareLink, AlbumPermission } from '../shareService';

/**
 * Mock fetch for testing
 */
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

/**
 * AuthService Tests
 */
describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    mockFetch.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Registration', () => {
    it('should register a new user', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoxNjkwMDExMjAwfQ.4uE6fXJ1R6e3-Dx6zx5b5c3a5b5c3a5b5c3a5b5c';
      const mockUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, user: mockUser }),
      } as any);

      const result = await authService.register('test@example.com', 'testuser', 'password123');

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(result.user).toEqual(mockUser);
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentUser()).toEqual(mockUser);
    });

    it('should handle registration errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Email already exists' }),
      } as any);

      const result = await authService.register('test@example.com', 'testuser', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });
  });

  describe('Login', () => {
    it('should login with email and password', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoxNjkwMDExMjAwfQ.4uE6fXJ1R6e3-Dx6zx5b5c3a5b5c3a5b5c3a5b5c';
      const mockUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, user: mockUser }),
      } as any);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should handle login errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid credentials' }),
      } as any);

      const result = await authService.login('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Token Management', () => {
    it('should refresh token before expiration', async () => {
      const oldToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoxNjkwMDAxMjAwfQ.xyz';
      const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTY5MDAwMTIwMCwiZXhwIjoxNjkwMDEyNDAwfQ.abc';
      const mockUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00Z',
      };

      // First login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: oldToken, user: mockUser }),
      } as any);

      await authService.login('test@example.com', 'password123');
      expect(authService.getToken()).toBe(oldToken);

      // Token refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: newToken }),
      } as any);

      const success = await authService.refreshAccessToken();
      expect(success).toBe(true);
      expect(authService.getToken()).toBe(newToken);
    });

    it('should get authorization header', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoxNjkwMDAxMjAwfQ.xyz';
      const mockUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, user: mockUser }),
      } as any);

      await authService.login('test@example.com', 'password123');
      const header = authService.getAuthorizationHeader();

      expect(header).toBe(`Bearer ${mockToken}`);
    });
  });

  describe('Logout', () => {
    it('should logout and clear session', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoxNjkwMDAxMjAwfQ.xyz';
      const mockUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken, user: mockUser }),
      } as any);

      await authService.login('test@example.com', 'password123');
      expect(authService.isAuthenticated()).toBe(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      await authService.logout();
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getToken()).toBeNull();
    });
  });
});

/**
 * UserService Tests
 */
describe('UserService', () => {
  let userService: UserService;
  const mockToken = 'mock-token';

  beforeEach(() => {
    userService = new UserService();
    userService.setAuthToken(mockToken);
    mockFetch.mockClear();
  });

  describe('User Profile', () => {
    it('should get current user profile', async () => {
      const mockUser: UserProfile = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as any);

      const user = await userService.getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('should update user profile', async () => {
      const updated: UserProfile = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Updated Name',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updated,
      } as any);

      const result = await userService.updateProfile({ displayName: 'Updated Name' });
      expect(result).toEqual(updated);
    });

    it('should search users', async () => {
      const mockUsers: UserProfile[] = [
        {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      } as any);

      const results = await userService.searchUsers('test', 10);
      expect(results).toEqual(mockUsers);
    });
  });

  describe('Password Management', () => {
    it('should change password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      const success = await userService.changePassword('oldpass', 'newpass');
      expect(success).toBe(true);
    });

    it('should handle password change errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Current password incorrect' }),
      } as any);

      const success = await userService.changePassword('wrongpass', 'newpass');
      expect(success).toBe(false);
    });
  });

  describe('User Settings', () => {
    it('should get user settings', async () => {
      const mockSettings: UserSettings = {
        userId: '1',
        theme: 'dark',
        notifications: true,
        emailNotifications: false,
        language: 'en',
        privacy: 'private',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      } as any);

      const settings = await userService.getUserSettings();
      expect(settings).toEqual(mockSettings);
    });

    it('should update user settings', async () => {
      const updated: UserSettings = {
        userId: '1',
        theme: 'light',
        notifications: true,
        emailNotifications: true,
        language: 'en',
        privacy: 'public',
        updatedAt: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updated,
      } as any);

      const result = await userService.updateSettings({ theme: 'light', privacy: 'public' });
      expect(result).toEqual(updated);
    });
  });

  describe('Follow System', () => {
    it('should follow a user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      const success = await userService.followUser('user-2');
      expect(success).toBe(true);
    });

    it('should unfollow a user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      const success = await userService.unfollowUser('user-2');
      expect(success).toBe(true);
    });

    it('should get followers', async () => {
      const mockFollowers: UserProfile[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFollowers,
      } as any);

      const followers = await userService.getFollowers('1');
      expect(followers).toEqual(mockFollowers);
    });
  });
});

/**
 * ShareService Tests
 */
describe('ShareService', () => {
  let shareService: ShareService;
  const mockToken = 'mock-token';

  beforeEach(() => {
    shareService = new ShareService();
    shareService.setAuthToken(mockToken);
    mockFetch.mockClear();
  });

  describe('Sharing Albums', () => {
    it('should share album with user', async () => {
      const mockPermission: AlbumPermission = {
        id: '1',
        albumId: 'album-1',
        userId: 'user-2',
        grantedBy: 'user-1',
        permissions: [Permission.VIEW],
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPermission,
      } as any);

      const result = await shareService.shareWithUser('album-1', 'user-2', [Permission.VIEW]);
      expect(result).toEqual(mockPermission);
    });

    it('should share album with email', async () => {
      const mockPermission: AlbumPermission = {
        id: '1',
        albumId: 'album-1',
        userId: 'new-user',
        grantedBy: 'user-1',
        permissions: [Permission.VIEW],
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPermission,
      } as any);

      const result = await shareService.shareWithEmail('album-1', 'newuser@example.com', [Permission.VIEW]);
      expect(result).toEqual(mockPermission);
    });

    it('should get share status', async () => {
      const mockStatus = {
        albumId: 'album-1',
        isShared: true,
        isPublic: false,
        permissions: [],
        shareLinks: [],
        sharedWithCount: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      } as any);

      const status = await shareService.getShareStatus('album-1');
      expect(status).toEqual(mockStatus);
    });
  });

  describe('Share Links', () => {
    it('should create public share link', async () => {
      const mockLink: ShareLink = {
        id: 'link-1',
        albumId: 'album-1',
        token: 'abc123',
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        usageCount: 0,
        isPublic: true,
        permissions: [Permission.VIEW],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLink,
      } as any);

      const link = await shareService.createShareLink('album-1', undefined, undefined, [Permission.VIEW]);
      expect(link).toEqual(mockLink);
    });

    it('should delete share link', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      const success = await shareService.deleteShareLink('album-1', 'link-1');
      expect(success).toBe(true);
    });
  });

  describe('Public/Private', () => {
    it('should make album public', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      const success = await shareService.makePublic('album-1', [Permission.VIEW]);
      expect(success).toBe(true);
    });

    it('should make album private', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      const success = await shareService.makePrivate('album-1');
      expect(success).toBe(true);
    });
  });

  describe('Permission Management', () => {
    it('should update permissions', async () => {
      const updated: AlbumPermission = {
        id: '1',
        albumId: 'album-1',
        userId: 'user-2',
        grantedBy: 'user-1',
        permissions: [Permission.VIEW, Permission.EDIT],
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updated,
      } as any);

      const result = await shareService.updatePermissions('album-1', 'user-2', [
        Permission.VIEW,
        Permission.EDIT,
      ]);
      expect(result).toEqual(updated);
    });

    it('should revoke access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any);

      const success = await shareService.revokeAccess('album-1', 'user-2');
      expect(success).toBe(true);
    });
  });

  describe('Shared Albums', () => {
    it('should get albums shared with me', async () => {
      const mockPermissions: AlbumPermission[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPermissions,
      } as any);

      const permissions = await shareService.getSharedWithMe();
      expect(permissions).toEqual(mockPermissions);
    });

    it('should get albums shared by me', async () => {
      const mockStatuses = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatuses,
      } as any);

      const statuses = await shareService.getSharedByMe();
      expect(statuses).toEqual(mockStatuses);
    });
  });

  describe('Access Validation', () => {
    it('should validate access token', async () => {
      const mockLink: ShareLink = {
        id: 'link-1',
        albumId: 'album-1',
        token: 'abc123',
        createdBy: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        usageCount: 5,
        isPublic: true,
        permissions: [Permission.VIEW],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLink,
      } as any);

      const result = await shareService.validateAccessToken('abc123');
      expect(result).toEqual(mockLink);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      shareService.clearCache();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
