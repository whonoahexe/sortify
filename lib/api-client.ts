export interface Track {
  id: string;
  name: string;
  trackNumber: number;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  coverImage: string;
  releaseDate: string;
  totalTracks?: number;
  tracks?: Track[];
}

export async function searchAlbums(query: string): Promise<Album[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error('Failed to search albums');
  }
  const data = await res.json();
  return data.albums || [];
}

export async function getAlbum(id: string): Promise<Album> {
  const res = await fetch(`/api/album?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error('Failed to get album details');
  }
  const data = await res.json();
  return data.album;
}
