import { EventEmitter } from 'events';

/**
 * User Profile
 */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Settings
 */
export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark';
  notifications: boolean;
  emailNotifications: boolean;
  language: string;
  privacy: 'public' | 'private' | 'friends-only';
  updatedAt: string;
}

/**
 * User Update Request
 */
export interface UserUpdateRequest {
  displayName?: string;
  bio?: string;
  avatar?: string;
}

/**
 * Password Change Request
 */
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * User Service
 * Manages user profiles, settings, and preferences
 * 
 * Features:
 * - Retrieve and update user profiles
 * - Manage user settings
 * - Change password
 * - Delete account
 * - User search and lookup
 * - Event-driven user updates
 */
export class UserService extends EventEmitter {
  private apiBaseUrl: string;
  private authToken: string | null = null;
  private userCache: Map<string, UserProfile> = new Map();
  private settingsCache: Map<string, UserSettings> = new Map();

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
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/me`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        this.emit('user-fetch-error', { error: 'Failed to fetch current user' });
        return null;
      }

      const user = await response.json();
      this.userCache.set(user.id, user);
      this.emit('user-loaded', { user });
      return user as UserProfile;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user';
      this.emit('user-fetch-error', { error: message });
      return null;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      // Check cache first
      if (this.userCache.has(userId)) {
        return this.userCache.get(userId) || null;
      }

      const response = await fetch(`${this.apiBaseUrl}/users/${userId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const user = await response.json();
      this.userCache.set(user.id, user);
      return user as UserProfile;
    } catch (error) {
      return null;
    }
  }

  /**
   * Search users by username or email
   */
  async searchUsers(query: string, limit: number = 20): Promise<UserProfile[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/users/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        return [];
      }

      const users = await response.json();
      users.forEach((user: UserProfile) => {
        this.userCache.set(user.id, user);
      });
      return users as UserProfile[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UserUpdateRequest): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/me`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('profile-update-error', { error: error.message });
        return null;
      }

      const user = await response.json();
      this.userCache.set(user.id, user);
      this.emit('profile-updated', { user });
      return user as UserProfile;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed';
      this.emit('profile-update-error', { error: message });
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/password`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('password-change-error', { error: error.message });
        return false;
      }

      this.emit('password-changed');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      this.emit('password-change-error', { error: message });
      return false;
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings(): Promise<UserSettings | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/me/settings`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const settings = await response.json();
      const userId = (await this.getCurrentUser())?.id;
      if (userId) {
        this.settingsCache.set(userId, settings);
      }
      this.emit('settings-loaded', { settings });
      return settings as UserSettings;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/me/settings`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('settings-update-error', { error: error.message });
        return null;
      }

      const updated = await response.json();
      const userId = (await this.getCurrentUser())?.id;
      if (userId) {
        this.settingsCache.set(userId, updated);
      }
      this.emit('settings-updated', { settings: updated });
      return updated as UserSettings;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Settings update failed';
      this.emit('settings-update-error', { error: message });
      return null;
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/me`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.emit('delete-account-error', { error: error.message });
        return false;
      }

      this.userCache.clear();
      this.settingsCache.clear();
      this.emit('account-deleted');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account deletion failed';
      this.emit('delete-account-error', { error: message });
      return false;
    }
  }

  /**
   * Get list of user's followers
   */
  async getFollowers(userId: string): Promise<UserProfile[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/${userId}/followers`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      return [];
    }
  }

  /**
   * Get list of users that user is following
   */
  async getFollowing(userId: string): Promise<UserProfile[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/${userId}/following`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      return [];
    }
  }

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/${userId}/follow`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return false;
      }

      this.emit('user-followed', { userId });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/${userId}/follow`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return false;
      }

      this.emit('user-unfollowed', { userId });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.userCache.clear();
    this.settingsCache.clear();
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
 * React Hook for User Management
 */
export function useUser() {
  const [userService] = React.useState(() => new UserService());
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await userService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const userSettings = await userService.getUserSettings();
        setSettings(userSettings);
      }
      setLoading(false);
    };

    userService.on('profile-updated', ({ user: updatedUser }) => {
      setUser(updatedUser);
    });

    userService.on('settings-updated', ({ settings: updatedSettings }) => {
      setSettings(updatedSettings);
    });

    userService.on('profile-update-error', ({ error: err }) => {
      setError(err);
    });

    loadUser();

    return () => {
      userService.removeAllListeners();
    };
  }, [userService]);

  const updateProfile = React.useCallback(
    async (updates: UserUpdateRequest) => {
      return userService.updateProfile(updates);
    },
    [userService]
  );

  const changePassword = React.useCallback(
    async (currentPassword: string, newPassword: string) => {
      return userService.changePassword(currentPassword, newPassword);
    },
    [userService]
  );

  const updateSettings = React.useCallback(
    async (newSettings: Partial<UserSettings>) => {
      return userService.updateSettings(newSettings);
    },
    [userService]
  );

  return {
    user,
    settings,
    loading,
    error,
    updateProfile,
    changePassword,
    updateSettings,
  };
}

import React from 'react';
