import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';
import { createUserPlaylist, addTracksToPlaylist } from '@/lib/spotify-user';

const REQUIRED_EXPORT_SCOPES = ['playlist-modify-private'];

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
  const token = await getValidAccessToken(REQUIRED_EXPORT_SCOPES);
  if (!token) {
    return NextResponse.json(
      {
        error:
          'Spotify requires re-authentication to allow modifying playlists.',
        requiresReauth: true,
      },
      { status: 403 }
    );
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
      false,
      token
    );

    const trackUris = rankedTrackIds.map((id) => `spotify:track:${id}`);
    
    // Spotify limits track additions to 100 per request
    const chunkSize = 100;
    for (let i = 0; i < trackUris.length; i += chunkSize) {
      const chunk = trackUris.slice(i, i + chunkSize);
      await addTracksToPlaylist(playlist.id, chunk, token);
    }

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

    // Check for 403 Forbidden which often means missing scopes
    if (error.message && (error.message.includes('403 ') || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { 
          error: 'Spotify requires re-authentication to allow modifying playlists.',
          requiresReauth: true
        }, 
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
