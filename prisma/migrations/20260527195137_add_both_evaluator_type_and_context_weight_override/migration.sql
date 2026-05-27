-- AlterEnum
ALTER TYPE "EvaluatorType" ADD VALUE 'BOTH';

-- AlterTable
ALTER TABLE "RequirementContext" ADD COLUMN     "weightOverride" "WeightLevel";
