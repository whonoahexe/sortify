import { getValidAccessToken } from './auth';

/**
 * Creates a public/private playlist in the user's Spotify account.
 */
export async function createUserPlaylist(
  userId: string,
  name: string,
  description: string,
  isPublic: boolean = false
) {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Unauthorized');

  const response = await fetch(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(
        `Rate limited by Spotify. Try again in ${retryAfter} seconds.`
      );
    }
    throw new Error(`Failed to create playlist: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Adds tracks (URIs) to a specific Spotify playlist.
 */
export async function addTracksToPlaylist(
  playlistId: string,
  trackUris: string[]
) {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Unauthorized');

  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: trackUris,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(
        `Rate limited by Spotify. Try again in ${retryAfter} seconds.`
      );
    }
    throw new Error(`Failed to add tracks: ${response.statusText}`);
  }

  return response.json();
}
