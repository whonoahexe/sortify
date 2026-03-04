import { cookies } from 'next/headers';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const NEXT_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const REDIRECT_URI = `${NEXT_PUBLIC_BASE_URL}/api/auth/callback`;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  throw new Error('Missing Spotify credentials in environment variables.');
}

export const AUTH_SCOPES = [
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-email',
].join(' ');

// Storage keys
export const STATE_COOKIE = 'spotify_auth_state';
export const CODE_VERIFIER_COOKIE = 'spotify_code_verifier';
export const ACCESS_TOKEN_COOKIE = 'spotify_access_token';
export const REFRESH_TOKEN_COOKIE = 'spotify_refresh_token';
export const TOKEN_EXPIRY_COOKIE = 'spotify_token_expiry';

/**
 * Common secure cookie options for all auth cookies.
 */
function getCookieOptions(maxAgeSeconds?: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    ...(maxAgeSeconds && { maxAge: maxAgeSeconds }),
  };
}

/**
 * Generates a random alphanumeric string for state/verifier.
 */
function generateRandomString(length: number) {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Initiates the PKCE flow. Generates state and verifier, hashes the verifier for the challenge,
 * sets the cookies, and returns the Spotify authorization URL.
 */
export async function getSpotifyOAuthUrl() {
  const state = generateRandomString(16);
  const verifier = generateRandomString(64);

  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const cookieStore = await cookies();

  cookieStore.set(STATE_COOKIE, state, getCookieOptions(60 * 10)); // 10 minutes
  cookieStore.set(CODE_VERIFIER_COOKIE, verifier, getCookieOptions(60 * 10));

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state,
    scope: AUTH_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchanges the authorization code for access and refresh tokens using PKCE verifier.
 */
export async function exchangeCodeForToken(code: string, verifier: string) {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Token exchange failed:', text);
    throw new Error('Failed to exchange authorization code for token');
  }

  return response.json();
}

/**
 * Persists the token response to secure HTTP-only cookies.
 */
export async function setTokenCookies(tokenData: any) {
  const cookieStore = await cookies();

  // expiry time = now + expires_in seconds
  const expiryTimeMs = Date.now() + tokenData.expires_in * 1000;

  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    tokenData.access_token,
    getCookieOptions(tokenData.expires_in)
  );

  cookieStore.set(
    TOKEN_EXPIRY_COOKIE,
    expiryTimeMs.toString(),
    getCookieOptions(tokenData.expires_in)
  );

  if (tokenData.refresh_token) {
    // Refresh tokens last longer. Let's say 30 days for the cookie.
    cookieStore.set(
      REFRESH_TOKEN_COOKIE,
      tokenData.refresh_token,
      getCookieOptions(60 * 60 * 24 * 30)
    );
  }
}

/**
 * Refreshes the user access token using the stored refresh token.
 */
export async function refreshUserToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID!,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  await setTokenCookies(data);
  return data.access_token;
}

/**
 * Retrieves a valid access token. Handles refreshing if expired.
 */
export async function getValidAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const expiryStr = cookieStore.get(TOKEN_EXPIRY_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken || !expiryStr) {
    if (refreshToken) {
      return await refreshUserToken(refreshToken);
    }
    return null;
  }

  const expiryTime = parseInt(expiryStr, 10);
  const now = Date.now();

  // If expired or about to expire in next minute
  if (now >= expiryTime - 60000) {
    if (refreshToken) {
      return await refreshUserToken(refreshToken);
    }
    return null;
  }

  return accessToken;
}

/**
 * Clears all auth-related cookies.
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(CODE_VERIFIER_COOKIE);
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(TOKEN_EXPIRY_COOKIE);
}
