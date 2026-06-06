-- AlterTable
ALTER TABLE "AccessRequest" ADD COLUMN     "requestAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;
