import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';
import { getRankingById, deleteRanking } from '@/lib/services/rankingService';

async function getUserIdFromToken(token: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.id as string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const idStr = (await params).id;
  try {
    const ranking = await getRankingById(idStr);

    if (!ranking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Public API - only expose these:
    return NextResponse.json({
      albumId: ranking.albumId,
      finalSortedTrackIds: JSON.parse(ranking.finalSortedTrackIds),
      createdAt: ranking.createdAt,
    });
  } catch (error) {
    console.error('Failed to fetch ranking:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const idStr = (await params).id;
    const ranking = await getRankingById(idStr);

    if (!ranking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (ranking.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = await deleteRanking(idStr, userId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Failed to delete ranking:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
