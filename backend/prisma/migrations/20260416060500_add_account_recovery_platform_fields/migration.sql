ALTER TABLE "AccountRecoveryRequest"
ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'ctrader',
ADD COLUMN "brokerName" TEXT,
ADD COLUMN "mt5Login" TEXT,
ADD COLUMN "mt5Server" TEXT,
ADD COLUMN "mt5Password" TEXT;