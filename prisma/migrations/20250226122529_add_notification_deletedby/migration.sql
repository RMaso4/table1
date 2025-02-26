-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deletedByUsers" TEXT[] DEFAULT ARRAY[]::TEXT[];
