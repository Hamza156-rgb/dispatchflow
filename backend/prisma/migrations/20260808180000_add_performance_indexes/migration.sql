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

CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "userLimit" INTEGER NOT NULL,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PricingPlan_code_key" ON "PricingPlan"("code");
CREATE INDEX "PricingPlan_active_sortOrder_idx" ON "PricingPlan"("active", "sortOrder");

INSERT INTO "PricingPlan" ("id", "code", "name", "tagline", "description", "price", "userLimit", "popular", "active", "sortOrder", "features", "createdAt", "updatedAt")
VALUES
  ('plan_starter', 'STARTER', 'Starter', 'For owner-operators getting started', 'Simple plan for small teams', 20, 5, false, true, 1, ARRAY['Up to 5 team members', 'Unlimited loads & invoices', 'Branded invoice PDFs', 'Client management', 'Email support'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_growth', 'GROWTH', 'Growth', 'For growing dispatch teams', 'Best for scaling operations', 40, 10, true, true, 2, ARRAY['Up to 10 team members', 'Everything in Starter', 'Smart insights & forecasts', 'WhatsApp + email sending', 'Priority support'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_business', 'BUSINESS', 'Business', 'For established dispatch companies', 'Advanced tooling for bigger teams', 60, 20, false, true, 3, ARRAY['Up to 20 team members', 'Everything in Growth', 'Custom branding', 'Advanced reports & export', 'Dedicated support'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
