/**
 * Presence Service - User Presence Tracking
 * 
 * Manages real-time user presence with:
 * - Active user tracking per album
 * - Heartbeat mechanism (5s intervals)
 * - Auto-cleanup on timeout
 * - Typing indicators
 */

interface PresenceInfo {
  userId: string;
  albumId: string;
  action: 'viewing' | 'editing' | 'typing';
  lastSeen: number;
}

interface UserPresence {
  userId: string;
  action: 'viewing' | 'editing' | 'typing';
  timestamp: number;
}

const PRESENCE_TIMEOUT = 30000; // 30 seconds
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

class PresenceService {
  private presenceMap: Map<string, PresenceInfo> = new Map();
  private activeUsers: Map<string, Set<string>> = new Map(); // albumId -> Set<userId>
  private typingUsers: Map<string, Set<string>> = new Map(); // albumId -> Set<userId>
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Start presence tracking
   */
  start(): void {
    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.broadcastPresence();
    }, HEARTBEAT_INTERVAL);

    // Start cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePresence();
    }, PRESENCE_TIMEOUT);
  }

  /**
   * Stop presence tracking
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Update user presence
   */
  updatePresence(userId: string, albumId: string, action: 'viewing' | 'editing' | 'typing'): void {
    const key = `${userId}:${albumId}`;

    this.presenceMap.set(key, {
      userId,
      albumId,
      action,
      lastSeen: Date.now(),
    });

    // Add to active users
    if (!this.activeUsers.has(albumId)) {
      this.activeUsers.set(albumId, new Set());
    }
    this.activeUsers.get(albumId)!.add(userId);

    // Track typing
    if (action === 'typing') {
      if (!this.typingUsers.has(albumId)) {
        this.typingUsers.set(albumId, new Set());
      }
      this.typingUsers.get(albumId)!.add(userId);
    } else {
      // Remove from typing if action changed
      const typing = this.typingUsers.get(albumId);
      if (typing) {
        typing.delete(userId);
      }
    }
  }

  /**
   * Get active users for an album
   */
  getActiveUsers(albumId: string): UserPresence[] {
    const users: UserPresence[] = [];

    this.presenceMap.forEach((presence) => {
      if (presence.albumId === albumId) {
        users.push({
          userId: presence.userId,
          action: presence.action,
          timestamp: presence.lastSeen,
        });
      }
    });

    return users;
  }

  /**
   * Get typing users for an album
   */
  getTypingUsers(albumId: string): string[] {
    return Array.from(this.typingUsers.get(albumId) || new Set());
  }

  /**
   * Remove user presence
   */
  removeUser(userId: string, albumId?: string): void {
    if (albumId) {
      const key = `${userId}:${albumId}`;
      this.presenceMap.delete(key);

      const active = this.activeUsers.get(albumId);
      if (active) {
        active.delete(userId);
      }

      const typing = this.typingUsers.get(albumId);
      if (typing) {
        typing.delete(userId);
      }
    } else {
      // Remove user from all albums
      const toDelete: string[] = [];
      this.presenceMap.forEach((presence, key) => {
        if (presence.userId === userId) {
          toDelete.push(key);
        }
      });

      toDelete.forEach((key) => {
        this.presenceMap.delete(key);
      });

      this.activeUsers.forEach((users) => {
        users.delete(userId);
      });

      this.typingUsers.forEach((users) => {
        users.delete(userId);
      });
    }
  }

  /**
   * Broadcast presence to all listeners
   */
  private broadcastPresence(): void {
    const presenceByAlbum = new Map<string, UserPresence[]>();

    this.presenceMap.forEach((presence) => {
      if (!presenceByAlbum.has(presence.albumId)) {
        presenceByAlbum.set(presence.albumId, []);
      }

      presenceByAlbum.get(presence.albumId)!.push({
        userId: presence.userId,
        action: presence.action,
        timestamp: presence.lastSeen,
      });
    });

    // Broadcast would happen via realtimeService
  }

  /**
   * Clean up stale presence entries
   */
  private cleanupStalePresence(): void {
    const now = Date.now();
    const staleEntries: string[] = [];

    this.presenceMap.forEach((presence, key) => {
      if (now - presence.lastSeen > PRESENCE_TIMEOUT) {
        staleEntries.push(key);
      }
    });

    staleEntries.forEach((key) => {
      const presence = this.presenceMap.get(key)!;
      console.log(`[PresenceService] Removing stale presence: ${presence.userId} in ${presence.albumId}`);
      this.presenceMap.delete(key);

      // Clean up from tracking sets
      const active = this.activeUsers.get(presence.albumId);
      if (active) {
        active.delete(presence.userId);
      }

      const typing = this.typingUsers.get(presence.albumId);
      if (typing) {
        typing.delete(presence.userId);
      }
    });
  }

  /**
   * Get all active albums
   */
  getActiveAlbums(): string[] {
    const albums: string[] = [];

    this.activeUsers.forEach((users, albumId) => {
      if (users.size > 0) {
        albums.push(albumId);
      }
    });

    return albums;
  }

  /**
   * Get activity timeline for an album
   */
  getActivityTimeline(albumId: string, limit: number = 50): Array<{
    userId: string;
    action: string;
    timestamp: number;
  }> {
    const activities: Array<{ userId: string; action: string; timestamp: number }> = [];

    this.presenceMap.forEach((presence) => {
      if (presence.albumId === albumId) {
        activities.push({
          userId: presence.userId,
          action: presence.action,
          timestamp: presence.lastSeen,
        });
      }
    });

    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Get presence statistics
   */
  getStats(): {
    totalUsers: number;
    activeAlbums: number;
    typingUsers: number;
    presenceEntries: number;
  } {
    let typingCount = 0;
    this.typingUsers.forEach((users) => {
      typingCount += users.size;
    });

    return {
      totalUsers: new Set(
        Array.from(this.presenceMap.values()).map((p) => p.userId),
      ).size,
      activeAlbums: this.activeUsers.size,
      typingUsers: typingCount,
      presenceEntries: this.presenceMap.size,
    };
  }

  /**
   * Clear all presence
   */
  clear(): void {
    this.presenceMap.clear();
    this.activeUsers.clear();
    this.typingUsers.clear();
  }
}

export default new PresenceService();
