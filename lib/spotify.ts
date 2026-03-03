export const getSpotifyToken = async () => {
  // We use the global object to cache the token in development so it survives HMR.
  // In production, this module-level variable will persist as long as the Vercel serverless function stays warm.
  const globalAny = global as any;

  if (globalAny.spotifyToken && globalAny.spotifyTokenExpiry > Date.now()) {
    return globalAny.spotifyToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables'
    );
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
    // Cache heavily or let fetch cache handle it? We handle caching manually.
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Spotify token: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the token
  globalAny.spotifyToken = data.access_token;
  // Expire 1 minute early to be safe
  globalAny.spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return data.access_token;
};

// Helper for fetching from Spotify API using the cached token
export const fetchSpotify = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = await getSpotifyToken();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://api.spotify.com/v1${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Spotify API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};
