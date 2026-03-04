'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Album, getAlbum } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface RankingData {
  id: string;
  albumId: string;
  createdAt: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [albums, setAlbums] = useState<Record<string, Album>>({});
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchLibrary = async () => {
      try {
        const res = await fetch('/api/rankings');
        if (!res.ok) throw new Error('Failed to fetch rankings');
        const data = await res.json();
        setRankings(data);

        // Fetch album metadata for each ranking
        const albumData: Record<string, Album> = {};
        for (const ranking of data) {
          if (!albumData[ranking.albumId]) {
            const album = await getAlbum(ranking.albumId);
            albumData[ranking.albumId] = album;
          }
        }
        setAlbums(albumData);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    fetchLibrary();
  }, [isAuthenticated]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this ranking?')) return;

    try {
      const res = await fetch(`/api/rankings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRankings((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete', error);
    }
  };

  if (loading || (isAuthenticated && fetching)) {
    return (
      <div className="mx-auto mt-12 min-h-screen max-w-4xl space-y-8 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null; // Let the useEffect redirect

  return (
    <main className="bg-background text-foreground min-h-screen p-6 pb-24 md:p-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Home
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">
              {user?.display_name}
            </span>
            <div className="bg-primary/20 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold uppercase">
              {user?.display_name?.[0] || 'U'}
            </div>
          </div>
        </div>

        <h1 className="mb-8 text-3xl font-bold tracking-tight">Your Library</h1>

        {rankings.length === 0 ? (
          <div className="border-border/50 bg-card/30 flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 text-center">
            <p className="text-muted-foreground mb-4 text-base">
              You haven't saved any rankings yet.
            </p>
            <Button onClick={() => router.push('/')}>Rank an Album</Button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {rankings.map((ranking) => {
                const album = albums[ranking.albumId];
                return (
                  <motion.div
                    key={ranking.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/share/${ranking.id}`)}
                      className="bg-card border-border hover:border-primary/30 flex cursor-pointer items-center gap-5 rounded-xl border p-4 transition-colors"
                    >
                      {album?.coverImage ? (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                          <Image
                            src={album.coverImage}
                            alt="Cover"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="bg-muted h-16 w-16 shrink-0 rounded-md" />
                      )}

                      <div className="min-w-0 grow">
                        <h3 className="truncate text-lg font-semibold">
                          {album?.name || 'Loading...'}
                        </h3>
                        <p className="text-muted-foreground truncate text-sm">
                          {album?.artist || 'Unknown Artist'}
                        </p>
                        <p className="text-muted-foreground/60 mt-1 text-xs">
                          {new Date(ranking.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                        onClick={(e) => handleDelete(ranking.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
