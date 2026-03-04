import { NextResponse } from 'next/server';
import { getSpotifyOAuthUrl } from '@/lib/auth';

export async function GET() {
  try {
    const url = await getSpotifyOAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Failed to initiate login:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
