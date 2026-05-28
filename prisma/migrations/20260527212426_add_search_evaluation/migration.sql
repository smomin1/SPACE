-- CreateTable
CREATE TABLE "SearchEvaluation" (
    "id" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metadata" JSONB,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "SearchEvaluation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SearchEvaluation" ADD CONSTRAINT "SearchEvaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
