-- CreateTable
CREATE TABLE "EvaluationTeamMerge" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "evaluatorType" "EvaluatorType" NOT NULL,
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mergedById" TEXT NOT NULL,

    CONSTRAINT "EvaluationTeamMerge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationTeamMerge_evaluationId_evaluatorType_key" ON "EvaluationTeamMerge"("evaluationId", "evaluatorType");

-- AddForeignKey
ALTER TABLE "EvaluationTeamMerge" ADD CONSTRAINT "EvaluationTeamMerge_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationTeamMerge" ADD CONSTRAINT "EvaluationTeamMerge_mergedById_fkey" FOREIGN KEY ("mergedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
