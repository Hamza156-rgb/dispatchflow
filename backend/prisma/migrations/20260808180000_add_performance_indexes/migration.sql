-- Performance indexes for the current app query patterns.
-- Safe, additive change only: no table rewrites, no data transforms.

CREATE INDEX "LoadBoardCredential_userId_provider_updatedAt_idx" ON "LoadBoardCredential"("userId", "provider", "updatedAt");

CREATE INDEX "Client_userId_companyName_idx" ON "Client"("userId", "companyName");

CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");
CREATE INDEX "Invoice_userId_dueDate_idx" ON "Invoice"("userId", "dueDate");
CREATE INDEX "Invoice_userId_clientId_idx" ON "Invoice"("userId", "clientId");

CREATE INDEX "Load_userId_createdAt_idx" ON "Load"("userId", "createdAt");
CREATE INDEX "Load_userId_status_idx" ON "Load"("userId", "status");
CREATE INDEX "Load_userId_paymentStatus_idx" ON "Load"("userId", "paymentStatus");
CREATE INDEX "Load_userId_pickupAt_idx" ON "Load"("userId", "pickupAt");
CREATE INDEX "Load_userId_clientId_idx" ON "Load"("userId", "clientId");
