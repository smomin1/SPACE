-- CreateEnum
CREATE TYPE "Team" AS ENUM (
  'STRATEGY_1',
  'STRATEGY_2',
  'STRATEGY_3',
  'STRATEGY_4',
  'STRATEGY_5',
  'STRATEGY_6',
  'LEARNING_SCIENCES',
  'EMERGING_TECHNOLOGY',
  'RESEARCH_AND_INNOVATION',
  'STEERING_COMMITTEE'
);

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

-- AlterTable: add new fields to User
ALTER TABLE "User"
  ADD COLUMN "team"               "Team",
  ADD COLUMN "mustChangePassword" BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "resetToken"         TEXT,
  ADD COLUMN "resetTokenExpiry"   TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateTable
CREATE TABLE "AccessRequest" (
  "id"            TEXT        NOT NULL,
  "email"         TEXT        NOT NULL,
  "name"          TEXT        NOT NULL,
  "team"          "Team"      NOT NULL,
  "requestedRole" "Role"      NOT NULL,
  "status"        "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "notes"         TEXT,
  "reviewedAt"    TIMESTAMP(3),
  "reviewedById"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AccessRequest"
  ADD CONSTRAINT "AccessRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
