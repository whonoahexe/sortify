import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';
import { createUserPlaylist, addTracksToPlaylist } from '@/lib/spotify-user';

async function getUserIdFromToken(token: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.id as string;
}

export async function POST(request: Request) {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { albumName, rankedTrackIds } = body;

    if (
      !rankedTrackIds ||
      !Array.isArray(rankedTrackIds) ||
      rankedTrackIds.length === 0 ||
      rankedTrackIds.some((id) => typeof id !== 'string')
    ) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (rankedTrackIds.length > 200) {
      return NextResponse.json(
        { error: 'Track limit exceeded (max 200)' },
        { status: 400 }
      );
    }

    const playlistName = `${albumName || 'Album'} — Ranked by Sortify`;
    const playlistDescription = 'Created automatically by Sortify.';

    const playlist = await createUserPlaylist(
      userId,
      playlistName,
      playlistDescription,
      false
    );

    const trackUris = rankedTrackIds.map((id) => `spotify:track:${id}`);
    await addTracksToPlaylist(playlist.id, trackUris);

    return NextResponse.json({
      success: true,
      url: playlist.external_urls.spotify,
    });
  } catch (error: any) {
    console.error('Export failed:', error);

    // Explicitly check for rate limits
    if (error.message && error.message.includes('Rate limited')) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
