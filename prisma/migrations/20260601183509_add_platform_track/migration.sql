-- CreateEnum
CREATE TYPE "EvaluationTrack" AS ENUM ('TOOL', 'VITAL');

-- AlterTable
ALTER TABLE "Platform" ADD COLUMN     "track" "EvaluationTrack" NOT NULL DEFAULT 'TOOL';
