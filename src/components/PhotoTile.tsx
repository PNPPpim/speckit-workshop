import React from 'react';
import { Photo } from '../types';
import styles from './PhotoTile.module.css';

interface PhotoTileProps {
  photo: Photo;
}

export const PhotoTile: React.FC<PhotoTileProps> = ({ photo }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Fallback when image fails to load
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
  };

  return (
    <div
      className={styles.tile}
      role="img"
      aria-label={photo.title}
      tabIndex={0}
    >
      <img
        src={photo.url}
        alt={photo.title}
        className={styles.image}
        loading="lazy"
        onError={handleImageError}
      />
      <p className={styles.title} title={photo.title}>
        {photo.title}
      </p>
    </div>
  );
};
