import React from 'react';
import { Album as AlbumType } from '../types';
import { PhotoTile } from './PhotoTile';
import styles from './Album.module.css';

interface AlbumProps {
  album: AlbumType;
}

export const Album: React.FC<AlbumProps> = ({ album }) => {
  return (
    <div className={styles.album}>
      <div className={styles.albumHeader}>
        <h2 className={styles.title} data-testid="album-title">{album.title}</h2>
        <span className={styles.photoCount} aria-label={`${album.photos.length} photos`}>
          {album.photos.length} photo{album.photos.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className={styles.photoGrid} role="region" aria-label={`Photos from ${album.title}`} data-testid="album-photos">
        {album.photos.length > 0 ? (
          album.photos.map((photo) => (
            <PhotoTile key={photo.id} photo={photo} />
          ))
        ) : (
          <p className={styles.emptyAlbum}>No photos in this album</p>
        )}
      </div>
    </div>
  );
};
