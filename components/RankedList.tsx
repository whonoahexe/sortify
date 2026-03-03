'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Check, Copy } from 'lucide-react';
import { Track } from '@/lib/api-client';

interface RankedListProps {
  albumName: string;
  artist: string;
  sortedTracks: string[];
  trackMap: Record<string, Track>;
}

const rankColors: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-zinc-300',
  3: 'text-orange-400',
};

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export function RankedList({
  albumName,
  artist,
  sortedTracks,
  trackMap,
}: RankedListProps) {
  const [copied, setCopied] = useState(false);

  const formatList = () => {
    let header = `${albumName} — ${artist}\n\n`;
    let body = sortedTracks
      .map(
        (id, index) => `${index + 1}. ${trackMap[id]?.name || 'Unknown Track'}`
      )
      .join('\n');
    return header + body;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatList());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Ranking</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {albumName} · {artist}
          </p>
        </div>
        <Button
          onClick={copyToClipboard}
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 rounded-lg"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? 'Copied!' : 'Copy list'}
        </Button>
      </motion.div>

      {/* Ranked items */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-2"
      >
        {sortedTracks.map((id, index) => {
          const track = trackMap[id];
          const rank = index + 1;
          const isTop3 = rank <= 3;

          return (
            <motion.div
              key={id}
              variants={itemVariants}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors duration-200 ${
                isTop3
                  ? 'bg-card border-border hover:border-primary/30'
                  : 'bg-card/60 border-border/60 hover:border-border'
              } `}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold tabular-nums ${
                  rankColors[rank]
                    ? `${rankColors[rank]} bg-foreground/5`
                    : 'text-muted-foreground/60 bg-transparent'
                } `}
              >
                {rank}
              </div>
              <div className="min-w-0 grow">
                <p
                  className={`truncate font-medium ${
                    isTop3 ? 'text-foreground' : 'text-foreground/80'
                  }`}
                >
                  {track?.name || 'Unknown Track'}
                </p>
                {track?.trackNumber && (
                  <p className="text-muted-foreground/50 mt-0.5 text-xs">
                    Track {track.trackNumber}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
