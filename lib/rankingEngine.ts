export type Phase =
  | 'IDLE'
  | 'RANKING'
  | 'AWAITING_COMPARISON'
  | 'MERGING'
  | 'COMPLETE';

export type MergeTuple = [string[], string[]];

export interface ActiveMerge {
  left: string[];
  right: string[];
  merged: string[];
}

export type SnapshotState = Omit<RankingEngineState, 'comparisonHistory'>;

export interface RankingEngineState {
  schemaVersion: number;
  albumId: string;
  originalTrackIds: string[];

  pendingPartitions: string[][];
  mergeQueue: MergeTuple[];
  activeMerge: ActiveMerge | null;

  comparisonHistory: SnapshotState[];

  totalMergeOperations: number;
  completedMergeOperations: number;

  comparisonCache: Record<string, Record<string, string>>;

  phase: Phase;
  finalSortedList: string[];
}

const SCHEMA_VERSION = 1;

/**
 * Deterministically calculate minimum expected decisions for n log2 n UI display
 */
export function estimateDecisions(n: number): number {
  if (n <= 1) return 0;
  return Math.ceil(n * Math.log2(n));
}

export function initializeRankingEngine(
  albumId: string,
  trackIds: string[]
): RankingEngineState {
  const initialState: RankingEngineState = {
    schemaVersion: SCHEMA_VERSION,
    albumId,
    originalTrackIds: [...trackIds],
    pendingPartitions: trackIds.map((id) => [id]),
    mergeQueue: [],
    activeMerge: null,
    comparisonHistory: [],
    totalMergeOperations: trackIds.length > 0 ? trackIds.length - 1 : 0,
    completedMergeOperations: 0,
    comparisonCache: {},
    phase: 'RANKING',
    finalSortedList: [],
  };

  return computeNextState(initialState);
}

/**
 * Creates a deep clone of the mutable structural state to save into history.
 * We omit comparisonHistory to prevent unbounded growth.
 */
function createSnapshot(state: RankingEngineState): SnapshotState {
  return {
    schemaVersion: state.schemaVersion,
    albumId: state.albumId,
    originalTrackIds: [...state.originalTrackIds],
    pendingPartitions: state.pendingPartitions.map((p) => [...p]),
    mergeQueue: state.mergeQueue.map(([l, r]) => [[...l], [...r]]),
    activeMerge: state.activeMerge
      ? {
          left: [...state.activeMerge.left],
          right: [...state.activeMerge.right],
          merged: [...state.activeMerge.merged],
        }
      : null,
    totalMergeOperations: state.totalMergeOperations,
    completedMergeOperations: state.completedMergeOperations,
    // Note: cache is symmetric, so cloning it is fine, though we could arguably share ref.
    // Deep cloning it for safety:
    comparisonCache: JSON.parse(JSON.stringify(state.comparisonCache)),
    phase: state.phase,
    finalSortedList: [...state.finalSortedList],
  };
}

/**
 * Evaluate the engine iteratively until it requires human comparison or completes.
 */
export function computeNextState(
  inputState: RankingEngineState
): RankingEngineState {
  // We mutate a local copy of the state during computation to avoid weird intermediate renders.
  const state: RankingEngineState = {
    ...inputState,
    pendingPartitions: inputState.pendingPartitions.map((p) => [...p]),
    mergeQueue: inputState.mergeQueue.map(([l, r]) => [[...l], [...r]]),
    activeMerge: inputState.activeMerge
      ? {
          left: [...inputState.activeMerge.left],
          right: [...inputState.activeMerge.right],
          merged: [...inputState.activeMerge.merged],
        }
      : null,
  };

  while (true) {
    if (state.phase === 'COMPLETE') {
      return state;
    }

    if (state.activeMerge) {
      if (
        state.activeMerge.left.length === 0 &&
        state.activeMerge.right.length === 0
      ) {
        // Technically shouldn't happen, but gracefully handle
        state.pendingPartitions.push(state.activeMerge.merged);
        state.completedMergeOperations++;
        state.activeMerge = null;
        continue;
      }

      if (state.activeMerge.left.length === 0) {
        state.activeMerge.merged.push(...state.activeMerge.right);
        state.activeMerge.right = [];
        state.pendingPartitions.push(state.activeMerge.merged);
        state.completedMergeOperations++;
        state.activeMerge = null;
        continue;
      }

      if (state.activeMerge.right.length === 0) {
        state.activeMerge.merged.push(...state.activeMerge.left);
        state.activeMerge.left = [];
        state.pendingPartitions.push(state.activeMerge.merged);
        state.completedMergeOperations++;
        state.activeMerge = null;
        continue;
      }

      // Both have items.
      const trackA = state.activeMerge.left[0];
      const trackB = state.activeMerge.right[0];

      // Check cache (symmetric)
      let cachedWinner: string | null = null;
      if (state.comparisonCache[trackA]?.[trackB]) {
        cachedWinner = state.comparisonCache[trackA][trackB];
      } else if (state.comparisonCache[trackB]?.[trackA]) {
        cachedWinner = state.comparisonCache[trackB][trackA];
      }

      if (cachedWinner) {
        if (cachedWinner === trackA) {
          state.activeMerge.merged.push(state.activeMerge.left.shift()!);
        } else {
          state.activeMerge.merged.push(state.activeMerge.right.shift()!);
        }
        continue; // Loop again
      }

      // No winner in cache, we need human input
      state.phase = 'AWAITING_COMPARISON';
      return state; // Return to caller to update UI
    }

    // activeMerge is null. Check mergeQueue.
    if (state.mergeQueue.length > 0) {
      const nextMerge = state.mergeQueue.shift()!;
      state.activeMerge = {
        left: nextMerge[0],
        right: nextMerge[1],
        merged: [],
      };
      state.phase = 'MERGING';
      continue;
    }

    // mergeQueue is empty, activeMerge is null. Time to build next mergeQueue pass.
    if (state.pendingPartitions.length <= 1) {
      // Done!
      if (state.pendingPartitions.length === 1) {
        state.finalSortedList = state.pendingPartitions[0];
        state.pendingPartitions = [];
      }
      state.phase = 'COMPLETE';
      return state;
    }

    // Create new pairs
    const newQueue: MergeTuple[] = [];
    while (state.pendingPartitions.length >= 2) {
      newQueue.push([
        state.pendingPartitions.shift()!,
        state.pendingPartitions.shift()!,
      ]);
    }
    state.mergeQueue = newQueue;
    // Any remaining odd partition stays in pendingPartitions for the next pass
    continue;
  }
}

/**
 * Registers a human selection, records the cache symmetrically, creates a snapshot for undo,
 * and pushes the state machine forward.
 */
export function registerComparison(
  inputState: RankingEngineState,
  trackA: string, // the track from left
  trackB: string, // the track from right
  winnerId: string
): RankingEngineState {
  if (inputState.phase !== 'AWAITING_COMPARISON' || !inputState.activeMerge) {
    throw new Error('Engine is not in a valid state to register a comparison.');
  }

  // Create snapshot before modifying
  const snapshot = createSnapshot(inputState);

  // Clone local struct
  const state: RankingEngineState = {
    ...inputState,
    comparisonHistory: [...inputState.comparisonHistory, snapshot],
    comparisonCache: JSON.parse(JSON.stringify(inputState.comparisonCache)),
    activeMerge: {
      left: [...inputState.activeMerge.left],
      right: [...inputState.activeMerge.right],
      merged: [...inputState.activeMerge.merged],
    },
  };

  // Record symmetric cache
  if (!state.comparisonCache[trackA]) state.comparisonCache[trackA] = {};
  if (!state.comparisonCache[trackB]) state.comparisonCache[trackB] = {};
  state.comparisonCache[trackA][trackB] = winnerId;
  state.comparisonCache[trackB][trackA] = winnerId;

  // Apply move implicitly (computeNextState handles this on next tick using cache,
  // but let's apply it directly here for simplicity so we don't rely only on cache lookup)
  if (winnerId === trackA) {
    state.activeMerge!.merged.push(state.activeMerge!.left.shift()!);
  } else {
    state.activeMerge!.merged.push(state.activeMerge!.right.shift()!);
  }

  // Compute rest of the state automatically
  return computeNextState(state);
}

/**
 * Restores the previous structural snapshot directly.
 */
export function undoLastComparison(
  state: RankingEngineState
): RankingEngineState {
  if (state.comparisonHistory.length === 0) {
    return state; // Nothing to undo
  }

  const previousHistory = [...state.comparisonHistory];
  const lastSnapshot = previousHistory.pop()!;

  // Restore everything perfectly
  return {
    ...lastSnapshot,
    comparisonHistory: previousHistory,
  };
}
