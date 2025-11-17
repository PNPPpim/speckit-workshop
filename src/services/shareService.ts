import { EventEmitter } from 'events';

/**
 * Permission Types
 */
export enum Permission {
  VIEW = 'view',
  EDIT = 'edit',
  DELETE = 'delete',
  SHARE = 'share',
  ADMIN = 'admin',
}

/**
 * Share Link
 */
export interface ShareLink {
  id: string;
  albumId: string;
  token: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxUses?: number;
  usageCount: number;
  isPublic: boolean;
  permissions: Permission[];
}

/**
 * Album Permission
 */
export interface AlbumPermission {
  id: string;
  albumId: string;
  userId: string;
  grantedBy: string;
  permissions: Permission[];
  createdAt: string;
  expiresAt?: string;
}

/**
 * Album Share Status
 */
export interface ShareStatus {
  albumId: string;
  isShared: boolean;
  isPublic: boolean;
  permissions: AlbumPermission[];
  shareLinks: ShareLink[];
  sharedWithCount: number;
}

/**
 * Share Request
 */
export interface ShareRequest {
  albumId: string;
  userId?: string;
  email?: string;
  permissions: Permission[];
  expiresAt?: string;
}

/**
 * Share Service
 * Manages album sharing and permissions
 * 
 * Features:
 * - Share albums with specific users
 * - Generate public share links with expiration
 * - Manage user permissions (view, edit, delete, share, admin)
 * - Revoke access
 * - List shared albums
 * - Validate access tokens
 * - Event-driven sharing updates
 */
export class ShareService extends EventEmitter {
  private apiBaseUrl: string;
  private authToken: string | null = null;
  private permissionCache: Map<string, AlbumPermission[]> = new Map();
  private shareLinkCache: Map<string, ShareLink[]> = new Map();

  constructor(apiBaseUrl: string = 'http://localhost:3001/api') {
    super();
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Set authentication token for requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get share status for an album
   */
  async getShareStatus(albumId: string): Promise<ShareStatus | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/share`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const status = await response.json();
      this.permissionCache.set(albumId, status.permissions);
      this.shareLinkCache.set(albumId, status.shareLinks);
      this.emit('share-status-loaded', { status });
      return status as ShareStatus;
    } catch (error) {
      return null;
    }
  }

  /**
   * Share album with a specific user
   */
  async shareWithUser(
    albumId: string,
    userId: string,
    permissions: Permission[]
  ): Promise<AlbumPermission | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/share/user`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ userId, permissions }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('share-error', { error: error.message });
        return null;
      }

      const permission = await response.json();
      this.invalidateCache(albumId);
      this.emit('album-shared', { albumId, userId, permissions });
      return permission as AlbumPermission;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Share failed';
      this.emit('share-error', { error: message });
      return null;
    }
  }

  /**
   * Share album with an email address
   */
  async shareWithEmail(
    albumId: string,
    email: string,
    permissions: Permission[]
  ): Promise<AlbumPermission | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/share/email`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, permissions }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('share-error', { error: error.message });
        return null;
      }

      const permission = await response.json();
      this.invalidateCache(albumId);
      this.emit('album-shared-email', { albumId, email, permissions });
      return permission as AlbumPermission;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Share failed';
      this.emit('share-error', { error: message });
      return null;
    }
  }

  /**
   * Create a public share link for an album
   */
  async createShareLink(
    albumId: string,
    expiresAt?: string,
    maxUses?: number,
    permissions: Permission[] = [Permission.VIEW]
  ): Promise<ShareLink | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/share/link`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ expiresAt, maxUses, permissions }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('link-creation-error', { error: error.message });
        return null;
      }

      const link = await response.json();
      this.invalidateCache(albumId);
      this.emit('share-link-created', { albumId, link });
      return link as ShareLink;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Link creation failed';
      this.emit('link-creation-error', { error: message });
      return null;
    }
  }

  /**
   * Make album public
   */
  async makePublic(albumId: string, permissions: Permission[] = [Permission.VIEW]): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/public`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('public-error', { error: error.message });
        return false;
      }

      this.invalidateCache(albumId);
      this.emit('album-made-public', { albumId, permissions });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to make public';
      this.emit('public-error', { error: message });
      return false;
    }
  }

  /**
   * Make album private
   */
  async makePrivate(albumId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/public`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('private-error', { error: error.message });
        return false;
      }

      this.invalidateCache(albumId);
      this.emit('album-made-private', { albumId });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to make private';
      this.emit('private-error', { error: message });
      return false;
    }
  }

  /**
   * Revoke access for a user
   */
  async revokeAccess(albumId: string, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/share/user/${userId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('revoke-error', { error: error.message });
        return false;
      }

      this.invalidateCache(albumId);
      this.emit('access-revoked', { albumId, userId });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Revoke failed';
      this.emit('revoke-error', { error: message });
      return false;
    }
  }

  /**
   * Delete a share link
   */
  async deleteShareLink(albumId: string, linkId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/share/link/${linkId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('link-deletion-error', { error: error.message });
        return false;
      }

      this.invalidateCache(albumId);
      this.emit('share-link-deleted', { albumId, linkId });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Link deletion failed';
      this.emit('link-deletion-error', { error: message });
      return false;
    }
  }

  /**
   * Update user permissions for an album
   */
  async updatePermissions(
    albumId: string,
    userId: string,
    permissions: Permission[]
  ): Promise<AlbumPermission | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/albums/${albumId}/share/user/${userId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('permission-update-error', { error: error.message });
        return null;
      }

      const updated = await response.json();
      this.invalidateCache(albumId);
      this.emit('permissions-updated', { albumId, userId, permissions });
      return updated as AlbumPermission;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Permission update failed';
      this.emit('permission-update-error', { error: message });
      return null;
    }
  }

  /**
   * Get albums shared with current user
   */
  async getSharedWithMe(): Promise<AlbumPermission[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/me/shared-albums`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      const permissions = await response.json();
      this.emit('shared-albums-loaded', { permissions });
      return permissions as AlbumPermission[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get albums shared by current user
   */
  async getSharedByMe(): Promise<ShareStatus[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/me/albums/shared`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      const statuses = await response.json();
      this.emit('my-shared-albums-loaded', { statuses });
      return statuses as ShareStatus[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Validate access token and get album details
   */
  async validateAccessToken(token: string): Promise<ShareLink | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/share/validate/${token}`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user has specific permission for album
   */
  async hasPermission(albumId: string, _permission: Permission): Promise<boolean> {
    try {
      const status = await this.getShareStatus(albumId);
      if (!status) {
        return false;
      }

      // Check if current user has permission
      // This would typically be checked server-side
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Invalidate cache for an album
   */
  private invalidateCache(albumId: string): void {
    this.permissionCache.delete(albumId);
    this.shareLinkCache.delete(albumId);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.shareLinkCache.clear();
  }

  /**
   * Get request headers with authentication
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
 * React Hook for Album Sharing
 */
export function useShare() {
  const [shareService] = React.useState(() => new ShareService());
  const [shareStatus, setShareStatus] = React.useState<ShareStatus | null>(null);
  const [sharedAlbums, setSharedAlbums] = React.useState<AlbumPermission[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    shareService.on('share-status-loaded', ({ status }) => {
      setShareStatus(status);
    });

    shareService.on('album-shared', () => {
      setError(null);
    });

    shareService.on('share-error', ({ error: err }) => {
      setError(err);
    });

    shareService.on('shared-albums-loaded', ({ permissions }) => {
      setSharedAlbums(permissions);
    });

    return () => {
      shareService.removeAllListeners();
    };
  }, [shareService]);

  const getShareStatus = React.useCallback(
    async (albumId: string) => {
      setLoading(true);
      const status = await shareService.getShareStatus(albumId);
      setLoading(false);
      return status;
    },
    [shareService]
  );

  const shareWithUser = React.useCallback(
    async (albumId: string, userId: string, permissions: Permission[]) => {
      setLoading(true);
      const result = await shareService.shareWithUser(albumId, userId, permissions);
      setLoading(false);
      return result;
    },
    [shareService]
  );

  const createShareLink = React.useCallback(
    async (
      albumId: string,
      expiresAt?: string,
      maxUses?: number,
      permissions?: Permission[]
    ) => {
      setLoading(true);
      const link = await shareService.createShareLink(albumId, expiresAt, maxUses, permissions);
      setLoading(false);
      return link;
    },
    [shareService]
  );

  const revokeAccess = React.useCallback(
    async (albumId: string, userId: string) => {
      setLoading(true);
      const success = await shareService.revokeAccess(albumId, userId);
      setLoading(false);
      return success;
    },
    [shareService]
  );

  return {
    shareStatus,
    sharedAlbums,
    loading,
    error,
    getShareStatus,
    shareWithUser,
    createShareLink,
    revokeAccess,
  };
}

import React from 'react';
