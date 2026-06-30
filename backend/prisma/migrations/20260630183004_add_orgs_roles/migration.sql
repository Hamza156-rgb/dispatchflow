-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'OWNER';

-- CreateIndex
CREATE INDEX "User_ownerId_idx" ON "User"("ownerId");
