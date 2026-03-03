'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Album } from '@/lib/api-client';

interface AlbumCardProps {
  album: Album;
  onClick?: () => void;
  index?: number;
}

export function AlbumCard({ album, onClick, index = 0 }: AlbumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="border-border bg-card hover:border-primary/40 focus-visible:ring-primary group w-full cursor-pointer overflow-hidden rounded-xl border text-left transition-all duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="bg-muted relative aspect-square w-full overflow-hidden">
          {album.coverImage ? (
            <Image
              src={album.coverImage}
              alt={album.name}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-sm">
              No Cover
            </div>
          )}
        </div>
        <div className="p-3.5">
          <h3 className="text-card-foreground group-hover:text-primary line-clamp-1 text-[15px] leading-snug font-semibold transition-colors duration-200">
            {album.name}
          </h3>
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
            {album.artist}
          </p>
          <p className="text-muted-foreground/50 mt-1.5 text-xs font-medium tabular-nums">
            {new Date(album.releaseDate).getFullYear()}
          </p>
        </div>
      </button>
    </motion.div>
  );
}
