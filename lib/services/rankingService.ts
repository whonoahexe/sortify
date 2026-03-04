import { prisma } from '../db';
import { Ranking } from '@prisma/client';

export async function saveRanking(
  userId: string,
  albumId: string,
  trackIds: string[]
): Promise<Ranking> {
  return await prisma.ranking.upsert({
    where: {
      userId_albumId: {
        userId,
        albumId,
      },
    },
    update: {
      finalSortedTrackIds: JSON.stringify(trackIds),
    },
    create: {
      userId,
      albumId,
      finalSortedTrackIds: JSON.stringify(trackIds),
    },
  });
}

export async function getUserRankings(userId: string): Promise<Ranking[]> {
  return await prisma.ranking.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getRankingById(id: string): Promise<Ranking | null> {
  return await prisma.ranking.findUnique({
    where: { id },
  });
}

export async function deleteRanking(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.ranking.deleteMany({
    where: {
      id,
      userId,
    },
  });

  return result.count > 0;
}
