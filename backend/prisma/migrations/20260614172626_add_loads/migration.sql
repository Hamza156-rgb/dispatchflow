-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('PENDING', 'ACTIVE', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoadPaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "loadNumber" TEXT NOT NULL,
    "originCity" TEXT,
    "originState" TEXT,
    "destCity" TEXT,
    "destState" TEXT,
    "pickupAt" TIMESTAMP(3),
    "deliveryAt" TIMESTAMP(3),
    "miles" DECIMAL(10,2),
    "rate" DECIMAL(10,2) NOT NULL,
    "equipment" TEXT,
    "weight" TEXT,
    "commodity" TEXT,
    "driver" TEXT,
    "referenceNumber" TEXT,
    "status" "LoadStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "LoadPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Load_userId_idx" ON "Load"("userId");

-- CreateIndex
CREATE INDEX "Load_clientId_idx" ON "Load"("clientId");

-- CreateIndex
CREATE INDEX "Load_status_idx" ON "Load"("status");

-- CreateIndex
CREATE INDEX "Load_paymentStatus_idx" ON "Load"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Load_userId_loadNumber_key" ON "Load"("userId", "loadNumber");

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
