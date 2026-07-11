CREATE TABLE "DailyLinkStat" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "botClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyLinkStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyLinkStat_linkId_date_key"
ON "DailyLinkStat"("linkId", "date");

CREATE INDEX "DailyLinkStat_date_idx" ON "DailyLinkStat"("date");
CREATE UNIQUE INDEX "Domain_hostname_key" ON "Domain"("hostname");
CREATE INDEX "Domain_workspaceId_idx" ON "Domain"("workspaceId");

ALTER TABLE "DailyLinkStat"
ADD CONSTRAINT "DailyLinkStat_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "Link"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Domain"
ADD CONSTRAINT "Domain_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
