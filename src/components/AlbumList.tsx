import React, { useState } from 'react';
import { Album as AlbumType } from '../types';
import { Album } from './Album';
import styles from './AlbumList.module.css';

interface AlbumListProps {
  albums: AlbumType[];
  onReorder: (albums: AlbumType[]) => void;
}

export const AlbumList: React.FC<AlbumListProps> = ({ albums, onReorder }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // Prevent dropping on the same album or attempting to nest
    if (index !== draggedIndex) {
      setDropIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDropIndex(null);
      return;
    }

    const newAlbums = [...albums];
    const [draggedAlbum] = newAlbums.splice(draggedIndex, 1);
    newAlbums.splice(index, 0, draggedAlbum);

    onReorder(newAlbums);
    setDraggedIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropIndex(null);
  };

  return (
    <div className={styles.container}>
      <h1>Photo Albums</h1>
      <p className={styles.subtitle}>Organize photos into albums grouped by date. Drag to reorder.</p>
      <div className={styles.albumList}>
        {albums.map((album, index) => (
          <div
            key={album.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={`${styles.albumWrapper} ${draggedIndex === index ? styles.dragging : ''} ${
              dropIndex === index ? styles.dropTarget : ''
            }`}
            role="button"
            tabIndex={0}
            aria-label={`Album: ${album.title}, ${album.photos.length} photos`}
          >
            <Album album={album} />
          </div>
        ))}
      </div>
      {albums.length === 0 && (
        <div className={styles.emptyState}>
          <p>No albums yet. Import photos to get started.</p>
        </div>
      )}
    </div>
  );
};
