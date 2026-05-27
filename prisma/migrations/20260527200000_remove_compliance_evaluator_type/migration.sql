-- Safety net: migrate any remaining COMPLIANCE rows before dropping the value
UPDATE "Requirement" SET "evaluatorType" = 'BOTH' WHERE "evaluatorType" = 'COMPLIANCE';
UPDATE "EvaluatorAssignment" SET "evaluatorType" = 'BOTH' WHERE "evaluatorType" = 'COMPLIANCE';
UPDATE "PlatformEvaluatorAssignment" SET "evaluatorType" = 'BOTH' WHERE "evaluatorType" = 'COMPLIANCE';
UPDATE "EvaluationTeamMerge" SET "evaluatorType" = 'BOTH' WHERE "evaluatorType" = 'COMPLIANCE';

-- PostgreSQL cannot drop an enum value in place; recreate the type without COMPLIANCE
ALTER TYPE "EvaluatorType" RENAME TO "EvaluatorType_old";
CREATE TYPE "EvaluatorType" AS ENUM ('PEDAGOGY', 'TECHNICAL', 'BOTH');

ALTER TABLE "Requirement" ALTER COLUMN "evaluatorType" TYPE "EvaluatorType" USING "evaluatorType"::text::"EvaluatorType";
ALTER TABLE "EvaluatorAssignment" ALTER COLUMN "evaluatorType" TYPE "EvaluatorType" USING "evaluatorType"::text::"EvaluatorType";
ALTER TABLE "PlatformEvaluatorAssignment" ALTER COLUMN "evaluatorType" TYPE "EvaluatorType" USING "evaluatorType"::text::"EvaluatorType";
ALTER TABLE "EvaluationTeamMerge" ALTER COLUMN "evaluatorType" TYPE "EvaluatorType" USING "evaluatorType"::text::"EvaluatorType";

DROP TYPE "EvaluatorType_old";
