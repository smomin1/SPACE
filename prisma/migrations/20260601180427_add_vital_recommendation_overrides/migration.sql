-- AlterTable
ALTER TABLE "VitalRecommendation" ADD COLUMN     "coreToolLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suppToolLocked" BOOLEAN NOT NULL DEFAULT false;
