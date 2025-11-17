import { Photo, Album } from '../types';

/**
 * Generate mock photos for testing and demonstration
 * @param count - Number of photos to generate
 * @returns Array of Photo objects with mock data
 */
export const generateMockPhotos = (count: number): Photo[] => {
  const photos: Photo[] = [];
  const baseDate = new Date('2024-11-01');

  for (let i = 0; i < count; i++) {
    // Distribute photos across multiple dates
    const daysOffset = Math.floor(Math.random() * 30);
    const photoDate = new Date(baseDate);
    photoDate.setDate(photoDate.getDate() + daysOffset);

    photos.push({
      id: `photo-${i}`,
      url: `https://picsum.photos/200/200?random=${i}`,
      title: `Photo ${i + 1}`,
      dateAdded: photoDate,
    });
  }

  return photos;
};

/**
 * Group photos by date and create albums
 * Photos are grouped by calendar day
 * @param photos - Array of photos to group
 * @returns Array of albums with photos grouped by date
 */
export const groupPhotosByDate = (photos: Photo[]): Album[] => {
  const albumMap = new Map<string, Photo[]>();

  // Group photos by date (YYYY-MM-DD)
  photos.forEach((photo) => {
    const dateKey = formatDateKey(photo.dateAdded);
    if (!albumMap.has(dateKey)) {
      albumMap.set(dateKey, []);
    }
    albumMap.get(dateKey)!.push(photo);
  });

  // Convert map to sorted albums
  const albums: Album[] = Array.from(albumMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map((entry, index) => {
      const [dateKey, albumPhotos] = entry;
      const date = new Date(dateKey);

      return {
        id: `album-${dateKey}`,
        date,
        title: formatDateLabel(date),
        photos: albumPhotos.sort(
          (a, b) => a.dateAdded.getTime() - b.dateAdded.getTime()
        ),
        order: index,
      };
    });

  return albums;
};

/**
 * Format a date as YYYY-MM-DD for use as a key
 * @param date - Date to format
 * @returns String in format YYYY-MM-DD
 */
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a date for display in album title
 * @param date - Date to format
 * @returns Human-readable date string
 */
const formatDateLabel = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
};

/**
 * Add photos to the system and group them into albums
 * Merges new photos with existing albums
 * @param existingAlbums - Existing albums
 * @param newPhotos - Photos to add
 * @returns Updated albums with new photos integrated
 */
export const addPhotosToAlbums = (
  existingAlbums: Album[],
  newPhotos: Photo[]
): Album[] => {
  // Collect all photos from existing albums
  const allPhotos = existingAlbums.reduce((acc: Photo[], album) => {
    return [...acc, ...album.photos];
  }, []);

  // Add new photos
  allPhotos.push(...newPhotos);

  // Regroup all photos by date
  return groupPhotosByDate(allPhotos);
};
