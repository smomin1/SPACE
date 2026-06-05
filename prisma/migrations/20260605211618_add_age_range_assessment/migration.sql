-- CreateTable
CREATE TABLE "PlatformAgeRange" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evaluatorType" "EvaluatorType" NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAgeRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeRangeConflict" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgeRangeConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeRangeConflictMessage" (
    "id" TEXT NOT NULL,
    "conflictId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgeRangeConflictMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAgeRange_evaluationId_userId_key" ON "PlatformAgeRange"("evaluationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgeRangeConflict_evaluationId_key" ON "AgeRangeConflict"("evaluationId");

-- AddForeignKey
ALTER TABLE "PlatformAgeRange" ADD CONSTRAINT "PlatformAgeRange_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAgeRange" ADD CONSTRAINT "PlatformAgeRange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgeRangeConflict" ADD CONSTRAINT "AgeRangeConflict_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgeRangeConflict" ADD CONSTRAINT "AgeRangeConflict_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgeRangeConflictMessage" ADD CONSTRAINT "AgeRangeConflictMessage_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "AgeRangeConflict"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgeRangeConflictMessage" ADD CONSTRAINT "AgeRangeConflictMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
