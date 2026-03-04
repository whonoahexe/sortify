# Sortify

Rank your favorite albums, track by track.

Sortify is a fast, deterministic pairwise ranking engine that allows you to discover your true track preferences for any album on Spotify. Built with a modern Next.js tech stack and beautiful motion physics.

## Features

- **Deterministic Ranking**: Uses a human-driven merge sort to evaluate tracks head-to-head.
- **Spotfiy Integration**: Pulls live metadata and album art directly from Spotify.
- **Beautiful Motion**: Smooth layouts and physics-based animations using Framer Motion.
- **Anonymous Usage**: Jump right in, search, and rank. No login required.
- **Optional Account Integration**: Sign in with Spotify to save rankings, view history, and generate shareable public links.
- **Export to Playlist**: Export your perfectly ranked list straight to a new Spotify playlist.
- **Keyboard Navigation**: Rapidly sort using `Arrow Left`/`Arrow Right` and `Z` to undo.

## Architecture

At its core, Sortify relies on an **iterative bottom-up merge sort state machine**. The user acts as the comparator function `O(N log N)`. The UI is strictly a reflection of the current `activeMerge` state.

For external interactions, a proxy routes all unauthenticated Spotify catalogue requests through server-side credentials, while authenticated user actions use the robust PKCE OAuth flow securely maintained via HttpOnly cookies and CSRF constraints. Ranking persistence and public sharing use a local SQLite database configured via Prisma.

## Tech Stack

- **Framework**: Next.js App Router
- **Styling**: Tailwind CSS, shadcn/ui
- **Motion**: Framer Motion
- **Database**: Prisma + SQLite
- **Auth**: Custom OAuth Code Flow with PKCE (Spotify API)

## Development Setup

1. Copy `.env.example` to `.env` (or create one) and configure your variables:
   ```env
   SPOTIFY_CLIENT_ID="your_spotify_app_id"
   SPOTIFY_CLIENT_SECRET="your_spotify_app_secret"
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the database:
   ```bash
   npx prisma db push
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Future Roadmap

- Drag-and-drop manual re-adjustments post-ranking.
- Track audio previews during battles.
- Global aggregate statistics for popular albums.
