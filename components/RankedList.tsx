'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Check, Copy, Save, Share, FolderOutput } from 'lucide-react';
import { Track } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

interface RankedListProps {
  albumId?: string;
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
  albumId,
  albumName,
  artist,
  sortedTracks,
  trackMap,
}: RankedListProps) {
  const { isAuthenticated } = useAuth();
  
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const formatList = () => {
    let header = `${albumName} - ${artist}\n\n`;
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

  const handleSave = async () => {
    if (!albumId) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId, rankedTrackIds: sortedTracks }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save ranking.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/playlist/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumName, rankedTrackIds: sortedTracks }),
      });
      
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json();
          throw new Error(data.error || 'Rate limited');
        }
        throw new Error('Export failed');
      }
      
      const { url } = await res.json();
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        if (url) window.open(url, '_blank');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to export to Spotify.');
    } finally {
      setIsExporting(false);
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
        
        <div className="flex flex-wrap items-center gap-2">
          {isAuthenticated && albumId && (
            <Button
              onClick={handleSave}
              variant="outline"
              size="sm"
              disabled={isSaving || saveSuccess}
              className="shrink-0 gap-2 rounded-lg"
            >
              {saveSuccess ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saveSuccess ? 'Saved' : 'Save'}
            </Button>
          )}

          {isAuthenticated && (
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={isExporting || exportSuccess}
              className="shrink-0 gap-2 rounded-lg"
            >
              {exportSuccess ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <FolderOutput className="h-3.5 w-3.5" />
              )}
              {exportSuccess ? 'Exported!' : 'Export Playlist'}
            </Button>
          )}

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
        </div>
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
