import { useState } from 'react';
import { ShareService, Permission } from '../services/shareService';
import styles from './ShareDialog.module.css';

/**
 * Share Dialog Component
 */
export function ShareDialog({
  albumId,
  isOpen,
  onClose,
}: {
  albumId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [shareService] = useState(() => new ShareService());
  const [email, setEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([Permission.VIEW]);
  const [shareType, setShareType] = useState<'user' | 'public'>('user');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handlePermissionToggle = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const handleShareWithUser = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await shareService.shareWithEmail(albumId, email, selectedPermissions);
      if (result) {
        setSuccess(`Album shared with ${email}`);
        setEmail('');
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 2000);
      } else {
        setError('Failed to share album');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePublic = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const success = await shareService.makePublic(albumId, selectedPermissions);
      if (success) {
        const link = await shareService.createShareLink(albumId, undefined, undefined, selectedPermissions);
        if (link) {
          setShareLink(`${window.location.origin}/share/${link.token}`);
          setSuccess('Album is now public!');
        }
      } else {
        setError('Failed to make album public');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Share Album</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {/* Share Type Selector */}
          <div className={styles.shareTypeSelector}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="user"
                checked={shareType === 'user'}
                onChange={(e) => setShareType(e.target.value as 'user' | 'public')}
                disabled={loading}
              />
              Share with User
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="public"
                checked={shareType === 'public'}
                onChange={(e) => setShareType(e.target.value as 'user' | 'public')}
                disabled={loading}
              />
              Make Public
            </label>
          </div>

          {/* User Share Form */}
          {shareType === 'user' && (
            <div className={styles.userShareForm}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={loading}
                  aria-label="Email to share with"
                />
              </div>
            </div>
          )}

          {/* Permission Checkboxes */}
          <fieldset className={styles.permissions}>
            <legend className={styles.label}>Permissions</legend>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={selectedPermissions.includes(Permission.VIEW)}
                onChange={() => handlePermissionToggle(Permission.VIEW)}
                disabled={loading}
              />
              View
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={selectedPermissions.includes(Permission.EDIT)}
                onChange={() => handlePermissionToggle(Permission.EDIT)}
                disabled={loading}
              />
              Edit
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={selectedPermissions.includes(Permission.SHARE)}
                onChange={() => handlePermissionToggle(Permission.SHARE)}
                disabled={loading}
              />
              Share
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={selectedPermissions.includes(Permission.DELETE)}
                onChange={() => handlePermissionToggle(Permission.DELETE)}
                disabled={loading}
              />
              Delete
            </label>
          </fieldset>

          {/* Public Link Display */}
          {shareLink && (
            <div className={styles.linkContainer}>
              <label className={styles.label}>Share Link</label>
              <div className={styles.linkBox}>
                <input
                  type="text"
                  className={styles.linkInput}
                  value={shareLink}
                  readOnly
                  aria-label="Public share link"
                />
                <button
                  className={styles.copyButton}
                  onClick={handleCopyLink}
                  aria-label="Copy link to clipboard"
                >
                  {linkCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.submitButton}
            onClick={shareType === 'user' ? handleShareWithUser : handleMakePublic}
            disabled={loading}
            aria-busy={loading}
          >
            {loading
              ? 'Loading...'
              : shareType === 'user'
                ? 'Share with User'
                : 'Make Public'}
          </button>
        </div>
      </div>
    </div>
  );
}
