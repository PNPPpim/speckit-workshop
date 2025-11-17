import React, { useState, useEffect } from 'react';
import { Album as AlbumType, AppState, Photo } from './types';
import { AlbumList } from './components/AlbumList';
import { generateMockPhotos, groupPhotosByDate } from './services/dataService';
import { loadAppState, saveAppState } from './services/storageService';
import './App.css';

export const App: React.FC = () => {
  const [albums, setAlbums] = useState<AlbumType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize app with data
  useEffect(() => {
    const initializeApp = () => {
      try {
        // Try to load existing state from storage
        const savedState = loadAppState();
        if (savedState && savedState.albums.length > 0) {
          setAlbums(savedState.albums);
        } else {
          // Initialize with mock data if no saved state exists
          const mockPhotos = generateMockPhotos(50);
          const initialAlbums = groupPhotosByDate(mockPhotos);
          setAlbums(initialAlbums);
          // Save initial state
          saveAppState({ albums: initialAlbums });
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        // Fallback: create albums with mock data
        const mockPhotos = generateMockPhotos(50);
        const initialAlbums = groupPhotosByDate(mockPhotos);
        setAlbums(initialAlbums);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleReorder = (reorderedAlbums: AlbumType[]) => {
    // Update the album order
    const updatedAlbums = reorderedAlbums.map((album, index) => ({
      ...album,
      order: index,
    }));
    setAlbums(updatedAlbums);
    // Persist the new order
    saveAppState({ albums: updatedAlbums });
  };

  if (isLoading) {
    return <div className="loading">Loading albums...</div>;
  }

  return (
    <div className="app">
      <AlbumList albums={albums} onReorder={handleReorder} />
    </div>
  );
};
