-- AlterTable
ALTER TABLE "CTraderAccount"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "phase2RepeatUsedAt" TIMESTAMP(3),
ADD COLUMN "repeatedFromAccountId" INTEGER,
ADD COLUMN "repeatReplacedByAccountId" INTEGER;

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "repeatForAccountId" INTEGER,
ADD COLUMN "repeatForChallengeId" TEXT;

-- Indexes
CREATE INDEX "CTraderAccount_archivedAt_idx" ON "CTraderAccount"("archivedAt");
CREATE INDEX "Order_repeatForAccountId_idx" ON "Order"("repeatForAccountId");