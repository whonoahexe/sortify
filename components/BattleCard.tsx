'use client';

import { motion, AnimatePresence } from 'motion/react';

interface BattleCardProps {
  trackName: string;
  trackKey: string;
  onClick: () => void;
  disabled?: boolean;
  isOpponentHovered?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

export function BattleCard({
  trackName,
  trackKey,
  onClick,
  disabled = false,
  isOpponentHovered = false,
  onHoverStart,
  onHoverEnd,
}: BattleCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={`focus-visible:ring-primary flex aspect-4/3 w-full items-center justify-center rounded-2xl border p-8 text-center transition-[border-color,background-color,opacity,box-shadow] duration-200 ease-out select-none focus-visible:ring-2 focus-visible:outline-none md:p-12 ${
        disabled
          ? 'border-border bg-card cursor-not-allowed opacity-50'
          : isOpponentHovered
            ? 'border-border/60 bg-card cursor-pointer opacity-80'
            : 'border-border bg-card hover:border-muted-foreground/40 surface-breathe cursor-pointer hover:shadow-[0_0_20px_-4px_oklch(0.75_0.12_280/0.1)]'
      } `}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={trackKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="text-foreground text-2xl leading-tight font-semibold tracking-tight md:text-4xl lg:text-5xl"
        >
          {trackName}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
