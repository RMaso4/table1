/*
  Warnings:

  - You are about to drop the `_OrderToPriorityOrder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_OrderToPriorityOrder" DROP CONSTRAINT "_OrderToPriorityOrder_A_fkey";

-- DropForeignKey
ALTER TABLE "_OrderToPriorityOrder" DROP CONSTRAINT "_OrderToPriorityOrder_B_fkey";

-- DropTable
DROP TABLE "_OrderToPriorityOrder";
