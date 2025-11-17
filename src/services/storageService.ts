import { AppState } from '../types';

const STORAGE_KEY = 'photoAlbumAppState';

/**
 * Load app state from localStorage
 * @returns Saved app state or null if not found
 */
export const loadAppState = (): AppState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    // Convert date strings back to Date objects
    if (parsed.albums) {
      parsed.albums.forEach((album: any) => {
        album.date = new Date(album.date);
        album.photos.forEach((photo: any) => {
          photo.dateAdded = new Date(photo.dateAdded);
        });
      });
    }

    return parsed as AppState;
  } catch (error) {
    console.error('Error loading app state from storage:', error);
    return null;
  }
};

/**
 * Save app state to localStorage
 * @param state - App state to persist
 */
export const saveAppState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving app state to storage:', error);
  }
};

/**
 * Clear all saved app state from localStorage
 */
export const clearAppState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing app state from storage:', error);
  }
};

/**
 * Get storage usage info for debugging
 * @returns Object with storage usage information
 */
export const getStorageInfo = (): { used: number; available: number } | null => {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      return null;
    }

    return {
      used: localStorage.length,
      available: 5242880, // 5MB typical limit
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return null;
  }
};
