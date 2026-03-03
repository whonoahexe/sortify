import { NextResponse } from 'next/server';
import { fetchSpotify } from '@/lib/spotify';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchSpotify(
      `/search?q=${encodeURIComponent(query)}&type=album&limit=10`
    );

    if (!data.albums || !data.albums.items) {
      return NextResponse.json({ albums: [] });
    }

    const albums = data.albums.items.map((album: any) => ({
      id: album.id,
      name: album.name,
      artist: album.artists.map((a: any) => a.name).join(', '),
      coverImage: album.images[0]?.url || '',
      releaseDate: album.release_date,
    }));

    return NextResponse.json({ albums });
  } catch (error) {
    console.error('Spotify Search Error:', error);
    return NextResponse.json(
      { error: 'Failed to search albums' },
      { status: 500 }
    );
  }
}
