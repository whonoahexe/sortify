import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';

export async function GET() {
  const token = await getValidAccessToken();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // Ensure we hit Spotify fresh
      cache: 'no-store',
    });

    if (!response.ok) {
      // Token might be valid but revoked by user?
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await response.json();
    return NextResponse.json({
      id: userData.id,
      display_name: userData.display_name,
      email: userData.email,
    });
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
