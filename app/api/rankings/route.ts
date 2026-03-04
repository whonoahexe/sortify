import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';
import { saveRanking, getUserRankings } from '@/lib/services/rankingService';

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
    const { albumId, rankedTrackIds } = body;

    if (!albumId || !Array.isArray(rankedTrackIds)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const ranking = await saveRanking(userId, albumId, rankedTrackIds);
    return NextResponse.json(ranking, { status: 201 });
  } catch (error) {
    console.error('Failed to save ranking:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rankings = await getUserRankings(userId);
    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Failed to get rankings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
