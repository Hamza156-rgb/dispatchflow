-- CreateEnum
CREATE TYPE "LoadSource" AS ENUM ('MANUAL', 'CSV', 'PASTE', 'DAT');

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" "LoadSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "LoadBoardCredential" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountLabel" TEXT,
    "usernameEnc" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "tokenEnc" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "LoadBoardCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoadBoardCredential_userId_idx" ON "LoadBoardCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadBoardCredential_userId_provider_key" ON "LoadBoardCredential"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Load_userId_externalId_key" ON "Load"("userId", "externalId");

-- AddForeignKey
ALTER TABLE "LoadBoardCredential" ADD CONSTRAINT "LoadBoardCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

