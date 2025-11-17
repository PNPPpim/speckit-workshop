# T045: Real-time Collaboration & Sync

**Status:** 🚀 **READY TO IMPLEMENT**  
**Estimated Duration:** 1 hour  
**Target Tests:** 10+ comprehensive test cases  
**Expected Lines:** 850+ lines of code + CSS  

---

## Executive Summary

T045 implements real-time synchronization for collaborative album editing. Multiple users can view and edit the same album simultaneously with real-time updates, presence awareness, and automatic conflict resolution.

**Key Features:**
- ✅ WebSocket real-time sync
- ✅ Presence awareness (who's viewing)
- ✅ Conflict-free replicated data types (CRDT)
- ✅ Typing indicators
- ✅ Activity feed
- ✅ Automatic reconnection
- ✅ Optimistic UI updates

---

## Implementation Overview

### Part 1: WebSocket Real-time Service (20 min)

**File:** `src/services/realtimeService.ts` (300 lines)

Key features:
- WebSocket connection management
- Event broadcasting
- Exponential backoff reconnection
- Message queuing during disconnect
- Event type system

### Part 2: Presence Service (20 min)

**File:** `src/services/presenceService.ts` (200 lines)

Key features:
- Track active users per album
- Presence heartbeat (5s intervals)
- Typing indicators
- Activity timeline
- Automatic cleanup

### Part 3: Conflict Resolution (10 min)

**File:** `src/services/conflictResolutionService.ts` (150 lines)

Key features:
- CRDT vector clocks
- Last-write-wins fallback
- Operational transformation
- Conflict logging
- Automatic resolution

### Part 4: Live Collaboration UI (10 min)

**File:** `src/components/LiveCollaborationPanel.tsx` (200 lines)

Key features:
- Active users display
- Activity feed
- Presence indicators
- Conflict warnings
- Real-time updates

---

## Service Implementations

### RealtimeService

```typescript
export class RealtimeService extends EventEmitter {
  private ws?: WebSocket;
  private messageQueue: any[] = [];
  private connectionAttempts = 0;
  private maxRetries = 5;
  private retryDelay = 1000;

  public connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          this.connectionAttempts = 0;
          this.flushMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.emit('message', message);
          this.emit(message.type, message.data);
        };

        this.ws.onerror = (error) => {
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  public send(type: string, data: any): void {
    const message = { type, data, timestamp: Date.now() };
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private attemptReconnect(): void {
    if (this.connectionAttempts >= this.maxRetries) {
      this.emit('connection-failed');
      return;
    }

    const delay = this.retryDelay * Math.pow(2, this.connectionAttempts);
    this.connectionAttempts++;

    setTimeout(() => {
      this.emit('reconnecting', { attempt: this.connectionAttempts });
      // Reconnect logic
    }, delay);
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

### PresenceService

```typescript
export class PresenceService {
  private activeUsers: Map<string, UserPresence> = new Map();
  private heartbeatInterval = 5000;
  private heartbeatTimers: Map<string, NodeJS.Timer> = new Map();

  public updatePresence(
    userId: string,
    albumId: string,
    action: 'viewing' | 'editing' | 'typing'
  ): void {
    const key = `${userId}:${albumId}`;
    
    this.activeUsers.set(key, {
      userId,
      albumId,
      action,
      lastSeen: Date.now(),
    });

    // Reset heartbeat timer
    if (this.heartbeatTimers.has(key)) {
      clearTimeout(this.heartbeatTimers.get(key)!);
    }

    const timer = setTimeout(() => {
      this.activeUsers.delete(key);
    }, this.heartbeatInterval * 2);

    this.heartbeatTimers.set(key, timer);
  }

  public getActiveUsers(albumId: string): UserPresence[] {
    return Array.from(this.activeUsers.values()).filter(
      (p) => p.albumId === albumId
    );
  }

  public removeUser(userId: string, albumId: string): void {
    const key = `${userId}:${albumId}`;
    this.activeUsers.delete(key);
    
    const timer = this.heartbeatTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.heartbeatTimers.delete(key);
    }
  }
}
```

### ConflictResolutionService

```typescript
export class ConflictResolutionService {
  private vectorClocks: Map<string, Map<string, number>> = new Map();

  public assignVectorClock(userId: string, albumId: string): number[] {
    const key = albumId;
    
    if (!this.vectorClocks.has(key)) {
      this.vectorClocks.set(key, new Map());
    }

    const clock = this.vectorClocks.get(key)!;
    const currentVersion = (clock.get(userId) || 0) + 1;
    clock.set(userId, currentVersion);

    return Array.from(clock.entries())
      .map(([_, version]) => version);
  }

  public detectConflict(edit1: Edit, edit2: Edit): boolean {
    // Check if edits affect same field
    if (edit1.field !== edit2.field) return false;

    // Check if they have different vector clocks
    return !this.vectorClocksEqual(edit1.vectorClock, edit2.vectorClock);
  }

  public resolveConflict(
    edit1: Edit,
    edit2: Edit
  ): Edit {
    // Last-write-wins
    if (edit1.timestamp > edit2.timestamp) {
      return edit1;
    } else if (edit2.timestamp > edit1.timestamp) {
      return edit2;
    }

    // If same timestamp, use userId as tiebreaker
    return edit1.userId > edit2.userId ? edit1 : edit2;
  }

  private vectorClocksEqual(c1: number[], c2: number[]): boolean {
    return JSON.stringify(c1) === JSON.stringify(c2);
  }
}
```

---

## Component Implementation

### LiveCollaborationPanel

```typescript
export function LiveCollaborationPanel({
  albumId,
  userId,
}: {
  albumId: string;
  userId: string;
}) {
  const [activeUsers, setActiveUsers] = React.useState<UserPresence[]>([]);
  const [activity, setActivity] = React.useState<ActivityEvent[]>([]);
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);

  React.useEffect(() => {
    const service = realtimeService;

    const handlePresenceUpdate = (presence: UserPresence[]) => {
      setActiveUsers(presence);
    };

    const handleActivity = (event: ActivityEvent) => {
      setActivity((prev) => [event, ...prev].slice(0, 20));
    };

    const handleConflict = (conflict: Conflict) => {
      setConflicts((prev) => [conflict, ...prev].slice(0, 10));
    };

    service.on('presence-update', handlePresenceUpdate);
    service.on('activity', handleActivity);
    service.on('conflict', handleConflict);

    return () => {
      service.off('presence-update', handlePresenceUpdate);
      service.off('activity', handleActivity);
      service.off('conflict', handleConflict);
    };
  }, [albumId]);

  return (
    <div className={styles.panel}>
      <section className={styles.activeUsers}>
        <h3>Active Users ({activeUsers.length})</h3>
        <div className={styles.userList}>
          {activeUsers.map((user) => (
            <div key={user.userId} className={styles.userItem}>
              <span className={styles.avatar}>
                {user.userId.charAt(0)}
              </span>
              <span className={styles.userId}>{user.userId}</span>
              <span className={styles.action}>{user.action}</span>
            </div>
          ))}
        </div>
      </section>

      {conflicts.length > 0 && (
        <section className={styles.conflicts}>
          <h3>⚠️ Conflicts Detected</h3>
          <div className={styles.conflictList}>
            {conflicts.map((conflict, idx) => (
              <div key={idx} className={styles.conflict}>
                <p>{conflict.message}</p>
                <small>{new Date(conflict.timestamp).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.activity}>
        <h3>Activity Feed</h3>
        <div className={styles.activityList}>
          {activity.map((event, idx) => (
            <div key={idx} className={styles.activityItem}>
              <span className={styles.user}>{event.userId}</span>
              <span className={styles.action}>{event.action}</span>
              <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

---

## Styling

```css
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.activeUsers, .conflicts, .activity {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activeUsers h3, .conflicts h3, .activity h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.userList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.userItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 12px;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 11px;
}

.action {
  font-size: 11px;
  color: #6b7280;
  background: white;
  padding: 2px 6px;
  border-radius: 3px;
}

.conflicts {
  border-left: 3px solid #ef4444;
  padding-left: 12px;
}

.conflictList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conflict {
  padding: 8px;
  background: #fee2e2;
  border-radius: 4px;
  border-left: 2px solid #ef4444;
}

.conflict p {
  margin: 0;
  font-size: 12px;
  color: #7f1d1d;
}

.conflict small {
  font-size: 11px;
  color: #b91c1c;
}

.activityList {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.activityItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 6px;
  border-bottom: 1px solid #e5e7eb;
}

.activityItem:last-child {
  border-bottom: none;
}

.user {
  font-weight: 600;
  color: #1f2937;
}

.action {
  color: #6b7280;
  flex: 1;
  margin: 0 8px;
}

time {
  color: #9ca3af;
  font-size: 11px;
}
```

---

## Tests (10+ test cases)

```typescript
describe('RealtimeService', () => {
  it('should connect to WebSocket');
  it('should send messages when connected');
  it('should queue messages when disconnected');
  it('should reconnect with exponential backoff');
  it('should emit connected event');
  it('should flush queue on reconnect');
});

describe('PresenceService', () => {
  it('should track active users');
  it('should update presence');
  it('should remove inactive users');
  it('should return users by album');
});

describe('ConflictResolutionService', () => {
  it('should assign vector clocks');
  it('should detect conflicts');
  it('should resolve conflicts by timestamp');
  it('should use userId as tiebreaker');
});

describe('LiveCollaborationPanel', () => {
  it('should display active users');
  it('should show conflict indicators');
  it('should update activity feed in real-time');
});
```

---

**Status:** ✅ **READY TO IMPLEMENT**  
**Estimated Time:** 1 hour  
**Lines of Code:** 850+ (code + CSS + tests)  

