-- CreateTable
CREATE TABLE "AccountRecoveryRequest" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountSize" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "declineReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "recoveredAccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "AccountRecoveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountRecoveryRequest_userId_idx" ON "AccountRecoveryRequest"("userId");

-- CreateIndex
CREATE INDEX "AccountRecoveryRequest_status_idx" ON "AccountRecoveryRequest"("status");

-- CreateIndex
CREATE INDEX "AccountRecoveryRequest_accountNumber_idx" ON "AccountRecoveryRequest"("accountNumber");

-- AddForeignKey
ALTER TABLE "AccountRecoveryRequest" ADD CONSTRAINT "AccountRecoveryRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecoveryRequest" ADD CONSTRAINT "AccountRecoveryRequest_recoveredAccountId_fkey" FOREIGN KEY ("recoveredAccountId") REFERENCES "CTraderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;