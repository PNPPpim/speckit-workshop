/**
 * Live Collaboration Panel Component
 * 
 * Displays real-time collaboration state with:
 * - Active users list
 * - Activity feed
 * - Conflict indicators
 * - Real-time updates
 */

import React, { useState, useEffect } from 'react';
import realtimeService from '../services/realtimeService';
import presenceService from '../services/presenceService';
import styles from './LiveCollaborationPanel.module.css';

interface ActiveUser {
  userId: string;
  action: 'viewing' | 'editing' | 'typing';
  timestamp: number;
}

interface ActivityEntry {
  id: string;
  userId: string;
  action: string;
  timestamp: number;
}

interface LiveCollaborationPanelProps {
  albumId: string;
  currentUserId: string;
}

const LiveCollaborationPanel: React.FC<LiveCollaborationPanelProps> = ({
  albumId,
  currentUserId,
}) => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Connect to realtime service
  useEffect(() => {
    const connectRealtime = async () => {
      try {
        // In production, this would connect to actual WebSocket server
        // For now, simulate connection
        setConnected(true);
      } catch (error) {
        console.error('Failed to connect to realtime service:', error);
        setConnected(false);
      }
    };

    connectRealtime();
  }, []);

  // Subscribe to presence updates
  useEffect(() => {
    if (!connected) return;

    const handlePresenceUpdate = () => {
      const users = presenceService.getActiveUsers(albumId);
      const typing = presenceService.getTypingUsers(albumId);

      setActiveUsers(
        users
          .filter((u) => u.userId !== currentUserId)
          .map((u) => ({
            userId: u.userId,
            action: u.action,
            timestamp: u.timestamp,
          })),
      );

      setTypingUsers(typing.filter((u) => u !== currentUserId));
    };

    const interval = setInterval(handlePresenceUpdate, 2000);
    handlePresenceUpdate();

    return () => clearInterval(interval);
  }, [albumId, currentUserId, connected]);

  // Subscribe to conflict updates
  useEffect(() => {
    if (!connected) return;

    const unsubscribe = realtimeService.on('conflict:detected', (event) => {
      if (event.data.albumId === albumId) {
        setConflictWarning(
          `Conflict detected: ${event.data.message || 'Concurrent edits'}`,
        );
        setTimeout(() => setConflictWarning(null), 5000);
      }
    });

    return () => unsubscribe();
  }, [albumId, connected]);

  // Subscribe to activity updates
  useEffect(() => {
    if (!connected) return;

    const unsubscribe = realtimeService.on('activity:updated', (event) => {
      if (event.data.albumId === albumId) {
        setActivity((prev) => {
          const updated = [
            {
              id: `activity_${Date.now()}`,
              userId: event.data.userId,
              action: event.data.action,
              timestamp: Date.now(),
            },
            ...prev,
          ];
          return updated.slice(0, 50); // Keep last 50 activities
        });
      }
    });

    return () => unsubscribe();
  }, [albumId, connected]);

  const handleContinueEditing = () => {
    presenceService.updatePresence(currentUserId, albumId, 'editing');
    realtimeService.send('presence:update', {
      userId: currentUserId,
      albumId,
      action: 'editing',
    });
  };

  return (
    <div className={styles.panel}>
      {/* Connection Status */}
      <div className={`${styles.statusBar} ${connected ? styles.connected : styles.disconnected}`}>
        <span className={styles.statusIndicator} />
        {connected ? 'Live Collaboration Active' : 'Connecting...'}
      </div>

      {/* Conflict Warning */}
      {conflictWarning && (
        <div className={styles.conflictWarning}>
          <span className={styles.warningIcon}>⚠️</span>
          {conflictWarning}
        </div>
      )}

      {/* Active Users Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Active Users ({activeUsers.length})
        </h3>

        {activeUsers.length > 0 ? (
          <div className={styles.usersList}>
            {activeUsers.map((user) => (
              <div key={user.userId} className={styles.userCard}>
                <div className={styles.userAvatar}>
                  {user.userId.charAt(0).toUpperCase()}
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{user.userId}</div>
                  <div
                    className={`${styles.userAction} ${styles[`action_${user.action}`]}`}
                  >
                    {user.action === 'typing'
                      ? 'Typing...'
                      : user.action === 'editing'
                        ? 'Editing'
                        : 'Viewing'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            You're the only one editing
          </div>
        )}
      </div>

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <div className={styles.typingIndicators}>
          <span className={styles.typingLabel}>
            {typingUsers.length} user{typingUsers.length !== 1 ? 's' : ''} typing
          </span>
          <span className={styles.typingDots}>
            <span></span><span></span><span></span>
          </span>
        </div>
      )}

      {/* Activity Feed */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Activity Feed</h3>

        {activity.length > 0 ? (
          <div className={styles.activityFeed}>
            {activity.map((entry) => (
              <div key={entry.id} className={styles.activityEntry}>
                <div className={styles.activityTime}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
                <div className={styles.activityContent}>
                  <strong>{entry.userId}</strong> {entry.action}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>No recent activity</div>
        )}
      </div>

      {/* Action Button */}
      {activeUsers.length > 0 && (
        <button
          className={styles.actionButton}
          onClick={handleContinueEditing}
        >
          Continue Editing
        </button>
      )}

      {/* Collaboration Stats */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Connected:</span>
          <span className={styles.statValue}>
            {connected ? 'Yes' : 'No'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Users:</span>
          <span className={styles.statValue}>
            {activeUsers.length + 1}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveCollaborationPanel;
