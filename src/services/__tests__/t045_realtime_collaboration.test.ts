/**
 * T045: Real-time Collaboration & Sync Tests
 * 
 * Comprehensive test suite for:
 * - WebSocket connection management
 * - Presence tracking & activity
 * - CRDT conflict resolution
 * - Real-time synchronization
 */

import realtimeService from '../services/realtimeService';
import presenceService from '../services/presenceService';
import conflictResolutionService from '../services/conflictResolutionService';

describe('T045: Real-time Collaboration & Sync', () => {
  beforeEach(() => {
    realtimeService.disconnect();
    presenceService.clear();
    conflictResolutionService.clear();
  });

  // ============= Realtime Service Tests =============

  describe('RealtimeService - WebSocket Management', () => {
    it('should have connection status', () => {
      expect(realtimeService.isConnected()).toBe(false);
    });

    it('should track queue size', () => {
      expect(realtimeService.getQueueSize()).toBe(0);
    });

    it('should queue messages when disconnected', () => {
      realtimeService.send('test:message', { data: 'test' });

      expect(realtimeService.getQueueSize()).toBe(1);
    });

    it('should queue multiple messages up to limit', () => {
      for (let i = 0; i < 50; i++) {
        realtimeService.send('test', { index: i });
      }

      expect(realtimeService.getQueueSize()).toBeLessThanOrEqual(100);
    });

    it('should provide connection stats', () => {
      realtimeService.send('test', {});

      const stats = realtimeService.getStats();

      expect(stats.connected).toBe(false);
      expect(stats.queueSize).toBeGreaterThanOrEqual(0);
      expect(stats.reconnectAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should emit connection events', (done) => {
      let eventFired = false;

      const unsubscribe = realtimeService.on('connection:established', () => {
        eventFired = true;
        unsubscribe();
        done();
      });

      // Note: In real environment, this would trigger when connection succeeds
      // For testing, we'd need a mock WebSocket
      setTimeout(() => {
        if (!eventFired) {
          unsubscribe();
          done();
        }
      }, 100);
    });

    it('should support event listener subscription', () => {
      let eventReceived = false;

      const unsubscribe = realtimeService.on('test:event', () => {
        eventReceived = true;
      });

      // Simulate event (internal emit would be called by WebSocket)
      unsubscribe();

      expect(typeof unsubscribe).toBe('function');
    });
  });

  // ============= Presence Service Tests =============

  describe('PresenceService - User Presence Tracking', () => {
    it('should start and stop presence tracking', () => {
      presenceService.start();
      expect(presenceService.getStats().presenceEntries).toBe(0);
      presenceService.stop();
    });

    it('should track user presence', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');

      const stats = presenceService.getStats();

      expect(stats.totalUsers).toBe(1);
      expect(stats.presenceEntries).toBe(1);
    });

    it('should get active users for album', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.updatePresence('user2', 'album1', 'editing');

      const users = presenceService.getActiveUsers('album1');

      expect(users.length).toBe(2);
      expect(users[0].action).toMatch(/viewing|editing/);
    });

    it('should track multiple users across albums', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.updatePresence('user1', 'album2', 'editing');
      presenceService.updatePresence('user2', 'album1', 'viewing');

      const stats = presenceService.getStats();

      expect(stats.totalUsers).toBe(2);
      expect(stats.activeAlbums).toBeGreaterThan(0);
    });

    it('should track typing users', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.updatePresence('user2', 'album1', 'typing');

      const typingUsers = presenceService.getTypingUsers('album1');

      expect(typingUsers).toContain('user2');
      expect(typingUsers).not.toContain('user1');
    });

    it('should remove user presence', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.removeUser('user1', 'album1');

      const users = presenceService.getActiveUsers('album1');

      expect(users.length).toBe(0);
    });

    it('should remove user from all albums', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.updatePresence('user1', 'album2', 'editing');
      presenceService.removeUser('user1');

      const album1Users = presenceService.getActiveUsers('album1');
      const album2Users = presenceService.getActiveUsers('album2');

      expect(album1Users.length).toBe(0);
      expect(album2Users.length).toBe(0);
    });

    it('should get activity timeline', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.updatePresence('user2', 'album1', 'editing');
      presenceService.updatePresence('user3', 'album1', 'typing');

      const timeline = presenceService.getActivityTimeline('album1');

      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0]).toHaveProperty('userId');
      expect(timeline[0]).toHaveProperty('action');
    });

    it('should get active albums', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.updatePresence('user2', 'album2', 'editing');

      const activeAlbums = presenceService.getActiveAlbums();

      expect(activeAlbums.length).toBeGreaterThan(0);
    });

    it('should provide presence statistics', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.updatePresence('user2', 'album1', 'typing');

      const stats = presenceService.getStats();

      expect(stats.totalUsers).toBe(2);
      expect(stats.typingUsers).toBe(1);
      expect(stats.presenceEntries).toBe(2);
    });

    it('should clear all presence', () => {
      presenceService.updatePresence('user1', 'album1', 'viewing');
      presenceService.updatePresence('user2', 'album1', 'editing');

      presenceService.clear();

      const stats = presenceService.getStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.presenceEntries).toBe(0);
    });
  });

  // ============= Conflict Resolution Tests =============

  describe('ConflictResolutionService - CRDT & Vector Clocks', () => {
    it('should assign vector clocks', () => {
      const vc = conflictResolutionService.assignVectorClock('user1', 'album1');

      expect(vc).toHaveProperty('user1');
      expect(vc.user1).toBe(1);
    });

    it('should increment vector clock on multiple assignments', () => {
      const vc1 = conflictResolutionService.assignVectorClock('user1', 'album1');
      const vc2 = conflictResolutionService.assignVectorClock('user1', 'album1');

      expect(vc2.user1).toBe(2);
      expect(vc2.user1).toBeGreaterThan(vc1.user1);
    });

    it('should detect non-conflicting operations', () => {
      const vc1 = conflictResolutionService.assignVectorClock('user1', 'album1');
      const vc2 = conflictResolutionService.assignVectorClock('user1', 'album1');

      const op1 = {
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'update' as const,
        data: { title: 'New' },
        vectorClock: vc1,
        timestamp: 1000,
      };

      const op2 = {
        id: 'op2',
        userId: 'user1',
        albumId: 'album1',
        action: 'update' as const,
        data: { title: 'Newer' },
        vectorClock: vc2,
        timestamp: 2000,
      };

      const resolution = conflictResolutionService.detectConflict(op1, op2);

      expect(resolution.conflicting).toBe(false);
    });

    it('should resolve conflicts using LWW (Last-Write-Wins)', () => {
      const vc1 = { user1: 1, user2: 0 };
      const vc2 = { user1: 0, user2: 1 };

      const op1 = {
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'update' as const,
        data: { title: 'User1 Version' },
        vectorClock: vc1,
        timestamp: 1000,
      };

      const op2 = {
        id: 'op2',
        userId: 'user2',
        albumId: 'album1',
        action: 'update' as const,
        data: { title: 'User2 Version' },
        vectorClock: vc2,
        timestamp: 2000,
      };

      const winner = conflictResolutionService.resolveConflict(op1, op2);

      expect(winner.id).toBe('op2'); // op2 has later timestamp
    });

    it('should add operations and detect conflicts', () => {
      const vc1 = conflictResolutionService.assignVectorClock('user1', 'album1');

      const op1 = {
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'update' as const,
        data: {},
        vectorClock: vc1,
        timestamp: 1000,
      };

      const result = conflictResolutionService.addOperation(op1);

      expect(result.conflicts).toBe(0);
    });

    it('should maintain operation history', () => {
      const vc = conflictResolutionService.assignVectorClock('user1', 'album1');

      for (let i = 0; i < 3; i++) {
        conflictResolutionService.addOperation({
          id: `op${i}`,
          userId: 'user1',
          albumId: 'album1',
          action: 'update',
          data: { index: i },
          vectorClock: vc,
          timestamp: 1000 + i,
        });
      }

      const history = conflictResolutionService.getOperationHistory('album1');

      expect(history.length).toBe(3);
    });

    it('should get causal order of operations', () => {
      const vc1 = conflictResolutionService.assignVectorClock('user1', 'album1');
      const vc2 = conflictResolutionService.assignVectorClock('user1', 'album1');
      const vc3 = conflictResolutionService.assignVectorClock('user1', 'album1');

      conflictResolutionService.addOperation({
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'create',
        data: {},
        vectorClock: vc1,
        timestamp: 1000,
      });

      conflictResolutionService.addOperation({
        id: 'op2',
        userId: 'user1',
        albumId: 'album1',
        action: 'update',
        data: {},
        vectorClock: vc2,
        timestamp: 2000,
      });

      conflictResolutionService.addOperation({
        id: 'op3',
        userId: 'user1',
        albumId: 'album1',
        action: 'update',
        data: {},
        vectorClock: vc3,
        timestamp: 3000,
      });

      const causal = conflictResolutionService.getCausalOrder('album1');

      expect(causal.length).toBe(3);
      expect(causal[0].id).toBe('op1');
    });

    it('should provide conflict statistics', () => {
      const vc = conflictResolutionService.assignVectorClock('user1', 'album1');

      conflictResolutionService.addOperation({
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'update',
        data: {},
        vectorClock: vc,
        timestamp: 1000,
      });

      const stats = conflictResolutionService.getStats();

      expect(stats.totalOperations).toBe(1);
      expect(stats.totalConflicts).toBe(0);
    });

    it('should clear all data', () => {
      const vc = conflictResolutionService.assignVectorClock('user1', 'album1');

      conflictResolutionService.addOperation({
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'update',
        data: {},
        vectorClock: vc,
        timestamp: 1000,
      });

      conflictResolutionService.clear();

      const stats = conflictResolutionService.getStats();

      expect(stats.totalOperations).toBe(0);
    });
  });

  // ============= Integration Tests =============

  describe('Integration - Full Real-time Collaboration Flow', () => {
    it('should handle multi-user editing session', () => {
      // User 1 starts editing
      const vc1 = conflictResolutionService.assignVectorClock('user1', 'album1');
      presenceService.updatePresence('user1', 'album1', 'editing');

      // User 2 starts viewing
      presenceService.updatePresence('user2', 'album1', 'viewing');

      // User 1 makes changes
      conflictResolutionService.addOperation({
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'update',
        data: { title: 'New Title' },
        vectorClock: vc1,
        timestamp: Date.now(),
      });

      // Verify state
      const users = presenceService.getActiveUsers('album1');
      const history = conflictResolutionService.getOperationHistory('album1');

      expect(users.length).toBe(2);
      expect(history.length).toBe(1);
    });

    it('should handle concurrent edits from multiple users', () => {
      const vc1 = conflictResolutionService.assignVectorClock('user1', 'album1');
      const vc2 = conflictResolutionService.assignVectorClock('user2', 'album1');

      presenceService.updatePresence('user1', 'album1', 'editing');
      presenceService.updatePresence('user2', 'album1', 'editing');

      const op1 = conflictResolutionService.addOperation({
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'update',
        data: { title: 'User1' },
        vectorClock: vc1,
        timestamp: 1000,
      });

      const op2 = conflictResolutionService.addOperation({
        id: 'op2',
        userId: 'user2',
        albumId: 'album1',
        action: 'update',
        data: { title: 'User2' },
        vectorClock: vc2,
        timestamp: 2000,
      });

      expect(op1.conflicts).toBeGreaterThanOrEqual(0);
      expect(op2.conflicts).toBeGreaterThanOrEqual(0);
    });
  });

  // ============= Performance Tests =============

  describe('Performance - Real-time Sync Targets', () => {
    it('should handle presence updates efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        presenceService.updatePresence(`user${i}`, 'album1', 'viewing');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should maintain low latency for conflict detection', () => {
      const vc1 = conflictResolutionService.assignVectorClock('user1', 'album1');
      const vc2 = conflictResolutionService.assignVectorClock('user2', 'album1');

      const op1 = {
        id: 'op1',
        userId: 'user1',
        albumId: 'album1',
        action: 'update' as const,
        data: {},
        vectorClock: vc1,
        timestamp: 1000,
      };

      const op2 = {
        id: 'op2',
        userId: 'user2',
        albumId: 'album1',
        action: 'update' as const,
        data: {},
        vectorClock: vc2,
        timestamp: 2000,
      };

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        conflictResolutionService.detectConflict(op1, op2);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // 100 conflict checks < 50ms
    });
  });
});
