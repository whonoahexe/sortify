-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "finalSortedTrackIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Ranking_userId_idx" ON "Ranking"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_userId_albumId_key" ON "Ranking"("userId", "albumId");
