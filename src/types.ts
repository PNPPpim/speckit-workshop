export interface Photo {
  id: string;
  url: string;
  title: string;
  dateAdded: Date;
}

export interface Album {
  id: string;
  date: Date;
  title: string;
  photos: Photo[];
  order: number;
}

export interface AppState {
  albums: Album[];
}
