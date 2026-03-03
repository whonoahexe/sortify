import { NextResponse } from 'next/server';
import { fetchSpotify } from '@/lib/spotify';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchSpotify(`/albums/${id}`);

    const album = {
      id: data.id,
      name: data.name,
      artist: data.artists.map((a: any) => a.name).join(', '),
      coverImage: data.images[0]?.url || '',
      releaseDate: data.release_date,
      totalTracks: data.total_tracks,
      tracks: data.tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        trackNumber: track.track_number,
      })),
    };

    return NextResponse.json({ album });
  } catch (error) {
    console.error('Spotify Album Details Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch album details' },
      { status: 500 }
    );
  }
}
