'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { getAlbum, Album, Track } from '@/lib/api-client';
import { useRankingEngine } from '@/hooks/useRankingEngine';
import { BattleCard } from '@/components/BattleCard';
import { RankedList } from '@/components/RankedList';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type ViewPhase = 'loading' | 'confirm' | 'battle' | 'completing' | 'results';

export default function RankPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.albumId as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSelectionLocked, setIsSelectionLocked] = useState(false);
  const [swapSides, setSwapSides] = useState(false);
  const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);

  // Completion interstitial
  const [showCompletionMoment, setShowCompletionMoment] = useState(false);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownCompletionRef = useRef(false);

  // Battle pair key for AnimatePresence
  const [battleKey, setBattleKey] = useState(0);

  // Progress bar milestone pulses
  const [progressPulse, setProgressPulse] = useState(false);
  const lastMilestoneRef = useRef(0);

  useEffect(() => {
    if (!albumId) return;
    getAlbum(albumId)
      .then(setAlbum)
      .catch((err) => setError(err.message));
  }, [albumId]);

  const trackIds = useMemo(
    () => album?.tracks?.map((t) => t.id) || [],
    [album]
  );

  const {
    state,
    isHydrating,
    estimatedDecisions,
    progress,
    selectTrack,
    undo,
  } = useRankingEngine(albumId, trackIds);

  // Resume if already in progress
  useEffect(() => {
    if (
      !isHydrating &&
      state &&
      state.completedMergeOperations > 0 &&
      state.phase !== 'COMPLETE'
    ) {
      setHasStarted(true);
    }
  }, [isHydrating, state]);

  // Randomize sides + unlock on new comparison
  useEffect(() => {
    if (state?.phase === 'AWAITING_COMPARISON') {
      setSwapSides(Math.random() > 0.5);
      setIsSelectionLocked(false);
      setBattleKey((k) => k + 1);
      setHoveredSide(null);
    }
  }, [state?.activeMerge?.left[0], state?.activeMerge?.right[0], state?.phase]);

  // Progress milestone detection
  useEffect(() => {
    const milestones = [25, 50, 75];
    const current = Math.floor(progress);
    const crossed = milestones.find(
      (m) => current >= m && lastMilestoneRef.current < m
    );
    if (crossed) {
      setProgressPulse(true);
      setTimeout(() => setProgressPulse(false), 1200);
    }
    lastMilestoneRef.current = current;
  }, [progress]);

  // Handle completion phase transition (fire once)
  useEffect(() => {
    if (
      state?.phase === 'COMPLETE' &&
      state.finalSortedList.length > 0 &&
      hasStarted &&
      !hasShownCompletionRef.current
    ) {
      hasShownCompletionRef.current = true;
      setShowCompletionMoment(true);
      completionTimerRef.current = setTimeout(() => {
        setShowCompletionMoment(false);
      }, 1500);
    }
  }, [state?.phase, state?.finalSortedList.length, hasStarted]);

  // Allow user to skip completion moment
  const skipCompletion = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
    }
    setShowCompletionMoment(false);
  }, []);

  const trackMap = useMemo(() => {
    const map: Record<string, Track> = {};
    album?.tracks?.forEach((t) => (map[t.id] = t));
    return map;
  }, [album]);

  // Keyboard shortcuts for battle
  useEffect(() => {
    if (
      !hasStarted ||
      isSelectionLocked ||
      state?.phase !== 'AWAITING_COMPARISON'
    )
      return;

    const trackAId = state?.activeMerge?.left[0];
    const trackBId = state?.activeMerge?.right[0];
    if (!trackAId || !trackBId) return;

    const leftId = swapSides ? trackBId : trackAId;
    const rightId = swapSides ? trackAId : trackBId;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === '1') {
        handleSelect(leftId);
      } else if (e.key === 'ArrowRight' || e.key === '2') {
        handleSelect(rightId);
      } else if (e.key.toLowerCase() === 'z') {
        if (state?.comparisonHistory.length ?? 0 > 0) undo();
      } else if (e.key === 'Escape') {
        if (confirm('Are you sure you want to quit this ranking? Current progress will be saved but you will leave this page.')) {
          router.push('/');
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    hasStarted,
    isSelectionLocked,
    state?.phase,
    state?.activeMerge,
    state?.comparisonHistory.length,
    swapSides,
    undo,
    router,
  ]);

  // Determine view phase
  const getViewPhase = (): ViewPhase => {
    if (!album || isHydrating || !state) return 'loading';
    if (state.phase === 'COMPLETE' && showCompletionMoment) return 'completing';
    if (state.phase === 'COMPLETE' && state.finalSortedList.length > 0)
      return 'results';
    if (!hasStarted) return 'confirm';
    return 'battle';
  };

  const viewPhase = getViewPhase();

  const handleStart = () => setHasStarted(true);

  const handleSelect = (winnerId: string) => {
    if (isSelectionLocked) return;
    setIsSelectionLocked(true);
    setTimeout(() => {
      selectTrack(winnerId);
    }, 150);
  };

  // ---- Error ----
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <h1 className="text-destructive mb-3 text-xl font-semibold">
          Error loading album
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
          Return Home
        </Button>
      </div>
    );
  }

  // ---- Loading ----
  if (viewPhase === 'loading') {
    return (
      <div className="mx-auto mt-12 min-h-screen max-w-4xl space-y-8 p-6">
        <div className="flex items-center gap-5">
          <Skeleton className="h-28 w-28 shrink-0 rounded-xl" />
          <div className="w-full space-y-3">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="mt-12 h-80 w-full rounded-xl" />
      </div>
    );
  }

  const trackAId = state!.activeMerge?.left[0];
  const trackBId = state!.activeMerge?.right[0];
  const trackA = trackAId ? trackMap[trackAId] : null;
  const trackB = trackBId ? trackMap[trackBId] : null;

  const decisionsUsed = state!.comparisonHistory.length;

  // ---- Completion Moment (interstitial) ----
  if (viewPhase === 'completing') {
    return (
      <motion.div
        className="bg-background text-foreground flex min-h-screen cursor-pointer flex-col items-center justify-center p-6"
        onClick={skipCompletion}
        onKeyDown={skipCompletion}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-center"
        >
          {album!.coverImage && (
            <motion.div
              layoutId="album-cover"
              className="relative mx-auto h-48 w-48 overflow-hidden rounded-xl shadow-2xl"
            >
              <Image
                src={album!.coverImage}
                alt={album!.name}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold tracking-tight">
              Ranking Complete
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {decisionsUsed} decisions made
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // ---- Results ----
  if (viewPhase === 'results') {
    return (
      <motion.div
        className="bg-background text-foreground min-h-screen p-6 pb-24 md:p-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              New ranking
            </Button>
          </div>

          {/* Album header */}
          <div className="mb-10 flex items-center gap-5">
            {album!.coverImage && (
              <motion.div
                layoutId="album-cover"
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg shadow-lg"
              >
                <Image
                  src={album!.coverImage}
                  alt={album!.name}
                  fill
                  className="object-cover"
                />
              </motion.div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">{album!.name}</h1>
              <p className="text-muted-foreground text-sm">{album!.artist}</p>
            </div>
          </div>

          <RankedList
            albumName={album!.name}
            artist={album!.artist}
            sortedTracks={state!.finalSortedList}
            trackMap={trackMap}
          />
        </div>
      </motion.div>
    );
  }

  // ---- Confirm ----
  if (viewPhase === 'confirm') {
    return (
      <div className="bg-background text-foreground relative flex min-h-screen flex-col items-center justify-center p-6 pb-24">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground absolute top-5 left-5"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm space-y-8 text-center"
        >
          {album!.coverImage && (
            <motion.div
              layoutId="album-cover"
              className="relative mx-auto h-64 w-64 overflow-hidden rounded-xl shadow-2xl md:h-72 md:w-72"
            >
              <Image
                src={album!.coverImage}
                alt={album!.name}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <h1 className="mb-1.5 text-2xl font-bold tracking-tight md:text-3xl">
              {album!.name}
            </h1>
            <p className="text-muted-foreground text-base">{album!.artist}</p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-muted-foreground/60 text-sm"
          >
            {album!.totalTracks} tracks · ~{estimatedDecisions} comparisons
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Button
              size="lg"
              className="h-13 w-full rounded-xl text-base font-semibold"
              onClick={handleStart}
            >
              Start ranking →
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ---- Battle ----
  return (
    <motion.div
      className="bg-background text-foreground relative flex min-h-screen flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background dim layer on pointer-down (via CSS only, managed by card press) */}

      {/* Top bar */}
      <header className="border-border/50 flex w-full items-center gap-3 border-b px-4 py-3 md:px-6">
        {/* Album anchor */}
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          {album!.coverImage && (
            <motion.div
              layoutId="album-cover"
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md shadow-sm"
            >
              <Image
                src={album!.coverImage}
                alt={album!.name}
                fill
                className="object-cover"
              />
            </motion.div>
          )}
          <p className="text-muted-foreground hidden max-w-[140px] truncate text-sm font-medium sm:block">
            {album!.name}
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative mx-2 flex-1 md:mx-6">
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <motion.div
              className={`bg-primary relative h-full rounded-full ${
                progressPulse ? 'progress-pulse' : ''
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Shimmer overlay */}
              <div className="progress-shimmer absolute inset-0 rounded-full" />
            </motion.div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            onClick={undo}
            disabled={
              state!.comparisonHistory.length === 0 || isSelectionLocked
            }
            title="Undo (backspace)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            onClick={() => router.push('/')}
            title="Quit"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Battle area */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-12 md:px-8">
        {trackA && trackB ? (
          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <BattleCard
                trackName={swapSides ? trackB.name : trackA.name}
                trackKey={swapSides ? trackB.id : trackA.id}
                onClick={() => handleSelect(swapSides ? trackB.id : trackA.id)}
                disabled={isSelectionLocked}
                isOpponentHovered={hoveredSide === "right"}
                onHoverStart={() => setHoveredSide("left")}
                onHoverEnd={() => setHoveredSide(null)}
              />
              <BattleCard
                trackName={swapSides ? trackA.name : trackB.name}
                trackKey={swapSides ? trackA.id : trackB.id}
                onClick={() => handleSelect(swapSides ? trackA.id : trackB.id)}
                disabled={isSelectionLocked}
                isOpponentHovered={hoveredSide === "left"}
                onHoverStart={() => setHoveredSide("right")}
                onHoverEnd={() => setHoveredSide(null)}
              />
          </div>
        ) : (
          <div className="flex h-80 w-full items-center justify-center">
            <p className="text-muted-foreground idle-glow text-sm">
              Computing next match...
            </p>
          </div>
        )}

        {/* Comparison counter */}
        <motion.p
          className="text-muted-foreground/40 mt-8 text-xs tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {decisionsUsed} of ~{estimatedDecisions}
        </motion.p>
        
        {/* Keyboard hints */}
        {trackA && trackB && (
          <motion.div
            className="text-muted-foreground/30 mt-12 flex items-center gap-3 text-[11px] font-medium tracking-wide uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            <span>← → to choose</span>
            <span>·</span>
            <span>Z to undo</span>
            <span>·</span>
            <span>Esc to quit</span>
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}
