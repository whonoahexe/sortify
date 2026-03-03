'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { searchAlbums, Album } from '@/lib/api-client';
import { AlbumCard } from '@/components/AlbumCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Album[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await searchAlbums(query);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAlbumSelect = (albumId: string) => {
    router.push(`/rank/${albumId}`);
  };

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center">
      {/* Hero / Search Area */}
      <div
        className={`flex w-full max-w-2xl flex-col items-center px-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hasSearched ? 'pt-10 pb-8' : '-mt-8 min-h-screen justify-center'
        }`}
      >
        <AnimatePresence mode="wait">
          {!hasSearched && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-10 text-center"
            >
              <h1 className="text-foreground mb-3 text-4xl font-bold tracking-tight md:text-5xl">
                sortify<span className="text-primary">.</span>
              </h1>
              <p className="text-muted-foreground mx-auto max-w-md text-base">
                Rank your favorite album, track by track.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-6 self-start"
          >
            <h1 className="text-foreground text-lg font-semibold tracking-tight">
              sortify<span className="text-primary">.</span>
            </h1>
          </motion.div>
        )}

        <form onSubmit={handleSearch} className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="text-muted-foreground/50 h-4.5 w-4.5" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for an album or artist..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-border bg-card focus-visible:ring-primary/40 focus-visible:border-primary/40 placeholder:text-muted-foreground/40 h-12 w-full rounded-xl pr-4 pl-12 text-[15px] focus-visible:ring-2"
          />
        </form>

        {!hasSearched && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-muted-foreground/40 mt-3 text-xs"
          >
            Try &ldquo;In Rainbows&rdquo; or &ldquo;Blonde&rdquo;
          </motion.p>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {hasSearched && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl px-6 pb-24"
          >
            {isSearching ? (
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2.5">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                {results.map((album, index) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    index={index}
                    onClick={() => handleAlbumSelect(album.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground py-24 text-center">
                <p className="text-base">No albums found.</p>
                <p className="text-muted-foreground/60 mt-1.5 text-sm">
                  Try a different search term.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
