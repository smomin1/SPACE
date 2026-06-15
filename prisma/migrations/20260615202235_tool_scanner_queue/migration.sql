-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'SCANNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "SearchEvaluation" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "error" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ScanStatus" NOT NULL DEFAULT 'COMPLETED';
