-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_platformRole_idx" ON "User"("platformRole");
CREATE INDEX "User_disabledAt_idx" ON "User"("disabledAt");
