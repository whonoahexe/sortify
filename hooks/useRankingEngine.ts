import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RankingEngineState,
  initializeRankingEngine,
  registerComparison,
  undoLastComparison,
  estimateDecisions,
} from '@/lib/rankingEngine';

export function useRankingEngine(albumId: string, trackIds: string[]) {
  const [state, setState] = useState<RankingEngineState | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // Use a ref to store the latest state for debounced saves
  const latestStateRef = useRef<RankingEngineState | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save to localStorage with debounce
  const debouncedSave = useCallback(
    (newState: RankingEngineState) => {
      latestStateRef.current = newState;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (latestStateRef.current) {
          try {
            localStorage.setItem(
              `ranking_${albumId}`,
              JSON.stringify(latestStateRef.current)
            );
          } catch (e) {
            console.error('Failed to save ranking state safely:', e);
          }
        }
      }, 200); // 200ms debounce
    },
    [albumId]
  );

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(`ranking_${albumId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as RankingEngineState;

        // Validate that trackIds match the original array structurally
        // If not, the album might have changed completely or we have bad data.
        const isMatch =
          parsed.originalTrackIds &&
          parsed.originalTrackIds.length === trackIds.length &&
          parsed.originalTrackIds.every((id, idx) => id === trackIds[idx]);

        if (isMatch) {
          setState(parsed);
          setIsHydrating(false);
          return;
        } else {
          console.warn(
            'Persisted track order mismatch. Resetting ranking engine.'
          );
          localStorage.removeItem(`ranking_${albumId}`);
        }
      }
    } catch (e) {
      console.error('Failed to parse stored ranking state', e);
    }

    // Initialize fresh
    const freshState = initializeRankingEngine(albumId, trackIds);
    setState(freshState);
    debouncedSave(freshState);
    setIsHydrating(false);
  }, [albumId, trackIds, debouncedSave]);

  const isSubmittingRef = useRef(false);

  const selectTrack = useCallback(
    (winnerId: string) => {
      if (!state || state.phase !== 'AWAITING_COMPARISON' || !state.activeMerge)
        return;
      
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      try {
        const trackA = state.activeMerge.left[0];
        const trackB = state.activeMerge.right[0];

        const nextState = registerComparison(state, trackA, trackB, winnerId);
        setState(nextState);
        debouncedSave(nextState);
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [state, debouncedSave]
  );

  const undo = useCallback(() => {
    if (!state || state.comparisonHistory.length === 0) return;

    const previousState = undoLastComparison(state);
    setState(previousState);
    debouncedSave(previousState);
  }, [state, debouncedSave]);

  const reset = useCallback(() => {
    const freshState = initializeRankingEngine(albumId, trackIds);
    setState(freshState);
    debouncedSave(freshState);
  }, [albumId, trackIds, debouncedSave]);

  const progress = state
    ? state.totalMergeOperations === 0
      ? 100
      : Math.min(
          100,
          Math.round(
            (state.completedMergeOperations / state.totalMergeOperations) * 100
          )
        )
    : 0;

  return {
    state,
    isHydrating,
    estimatedDecisions: estimateDecisions(trackIds.length),
    progress,
    selectTrack,
    undo,
    reset,
  };
}
