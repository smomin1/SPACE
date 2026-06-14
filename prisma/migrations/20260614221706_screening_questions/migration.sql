/*
  Warnings:

  - You are about to drop the column `scores` on the `SearchEvaluation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ScreeningAnswer" AS ENUM ('YES', 'PARTIAL', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ScreeningHardFail" AS ENUM ('IF_YES', 'IF_NO');

-- Existing scans use the old 0-4 score shape, which is incompatible with the new
-- question-driven model. They are exploratory/disposable, so clear them before
-- dropping the column to avoid leaving empty, unreadable scans behind.
DELETE FROM "SearchEvaluation";

-- AlterTable
ALTER TABLE "SearchEvaluation" DROP COLUMN "scores";

-- CreateTable
CREATE TABLE "ScreeningQuestion" (
    "id" TEXT NOT NULL,
    "num" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "whatToLookFor" TEXT,
    "hardFail" "ScreeningHardFail",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningResponse" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" "ScreeningAnswer" NOT NULL,
    "evidence" TEXT,
    "flag" TEXT,
    "notes" TEXT,

    CONSTRAINT "ScreeningResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningResponse_evaluationId_questionId_key" ON "ScreeningResponse"("evaluationId", "questionId");

-- AddForeignKey
ALTER TABLE "ScreeningResponse" ADD CONSTRAINT "ScreeningResponse_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "SearchEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningResponse" ADD CONSTRAINT "ScreeningResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ScreeningQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
