"use client";

import { motion, AnimatePresence } from "motion/react";

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
      className={`
        w-full aspect-4/3
        flex items-center justify-center p-8 md:p-12 text-center
        rounded-2xl border select-none
        transition-[border-color,background-color,opacity,box-shadow] duration-200 ease-out
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none
        ${
          disabled
            ? "opacity-50 cursor-not-allowed border-border bg-card"
            : isOpponentHovered
            ? "opacity-80 border-border/60 bg-card cursor-pointer"
            : "cursor-pointer border-border bg-card hover:border-muted-foreground/40 hover:shadow-[0_0_20px_-4px_oklch(0.75_0.12_280/0.1)] surface-breathe"
        }
      `}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={trackKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-foreground"
        >
          {trackName}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
