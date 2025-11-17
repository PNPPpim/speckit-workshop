import { useState, useEffect } from 'react';
import { ShareService, Permission, AlbumPermission } from '../services/shareService';
import styles from './PermissionManager.module.css';

/**
 * Permission Manager Component
 */
export function PermissionManager({ albumId }: { albumId: string }) {
  const [shareService] = useState(() => new ShareService());
  const [permissions, setPermissions] = useState<AlbumPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<{
    [key: string]: Permission[];
  }>({});

  useEffect(() => {
    loadPermissions();
  }, [albumId]);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await shareService.getShareStatus(albumId);
      if (status) {
        setPermissions(status.permissions);
        const permMap = status.permissions.reduce(
          (acc, p) => {
            acc[p.userId] = p.permissions;
            return acc;
          },
          {} as { [key: string]: Permission[] }
        );
        setSelectedPermissions(permMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (userId: string, permission: Permission) => {
    setSelectedPermissions((prev) => {
      const userPerms = prev[userId] || [];
      const updated = userPerms.includes(permission)
        ? userPerms.filter((p) => p !== permission)
        : [...userPerms, permission];
      return { ...prev, [userId]: updated };
    });
  };

  const handleUpdatePermissions = async (userId: string) => {
    try {
      const newPermissions = selectedPermissions[userId] || [];
      const result = await shareService.updatePermissions(albumId, userId, newPermissions);
      if (result) {
        // Update local state
        setPermissions((prev) =>
          prev.map((p) => (p.userId === userId ? result : p))
        );
        setError(null);
      } else {
        setError('Failed to update permissions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    }
  };

  const handleRevoke = async (userId: string) => {
    try {
      const success = await shareService.revokeAccess(albumId, userId);
      if (success) {
        setPermissions((prev) => prev.filter((p) => p.userId !== userId));
        setSelectedPermissions((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
        setError(null);
      } else {
        setError('Failed to revoke access');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading permissions...</div>;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Manage Permissions</h3>

      {error && <div className={styles.error}>{error}</div>}

      {permissions.length === 0 ? (
        <p className={styles.empty}>No users have access to this album yet.</p>
      ) : (
        <div className={styles.permissionsList}>
          {permissions.map((perm) => (
            <div key={perm.userId} className={styles.permissionRow}>
              <div className={styles.userInfo}>
                <p className={styles.userId}>{perm.userId}</p>
                <p className={styles.grantedBy}>Shared by {perm.grantedBy}</p>
              </div>

              <div className={styles.permissions}>
                {Object.values(Permission).map((permission) => (
                  <label key={permission} className={styles.permissionCheckbox}>
                    <input
                      type="checkbox"
                      checked={(selectedPermissions[perm.userId] || []).includes(permission)}
                      onChange={() => handlePermissionToggle(perm.userId, permission)}
                    />
                    <span className={styles.permissionLabel}>
                      {permission.charAt(0).toUpperCase() + permission.slice(1)}
                    </span>
                  </label>
                ))}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.updateButton}
                  onClick={() => handleUpdatePermissions(perm.userId)}
                >
                  Update
                </button>
                <button
                  className={styles.revokeButton}
                  onClick={() => handleRevoke(perm.userId)}
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
