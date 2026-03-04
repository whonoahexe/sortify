'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Album, Track, getAlbum } from '@/lib/api-client';
import { RankedList } from '@/components/RankedList';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ShareData {
  albumId: string;
  finalSortedTrackIds: string[];
  createdAt: string;
}

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const rankingId = params.rankingId as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rankingId) return;

    const fetchShareData = async () => {
      try {
        const res = await fetch(`/api/rankings/${rankingId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        setShareData(data);

        // Fetch album metadata
        const albumData = await getAlbum(data.albumId);
        setAlbum(albumData);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [rankingId]);

  const trackMap = useMemo(() => {
    const map: Record<string, Track> = {};
    album?.tracks?.forEach((t) => (map[t.id] = t));
    return map;
  }, [album]);

  if (loading) {
    return (
      <div className="mx-auto mt-12 min-h-screen max-w-4xl space-y-8 p-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="mt-6 flex items-center gap-5">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <div className="w-48 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="space-y-4 pt-12">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !shareData || !album) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <h1 className="mb-3 text-2xl font-bold tracking-tight">
          Ranking Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          This ranking either doesn't exist or has been deleted.
        </p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <main className="bg-background text-foreground min-h-screen p-6 pb-24 md:p-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Create your own ranking
          </Button>
        </div>

        {/* Album header */}
        <div className="mb-10 flex items-center gap-5">
          {album.coverImage && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg shadow-lg">
              <Image
                src={album.coverImage}
                alt={album.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{album.name}</h1>
            <p className="text-muted-foreground">{album.artist}</p>
            <p className="text-muted-foreground/50 mt-1 text-xs">
              Ranked on {new Date(shareData.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <RankedList
          albumName={album.name}
          artist={album.artist}
          sortedTracks={shareData.finalSortedTrackIds}
          trackMap={trackMap}
        />
      </div>
    </main>
  );
}
