-- CreateTable
CREATE TABLE "PriorityOrder" (
    "id" TEXT NOT NULL,
    "orderIds" TEXT[],
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorityOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OrderToPriorityOrder" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrderToPriorityOrder_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_OrderToPriorityOrder_B_index" ON "_OrderToPriorityOrder"("B");

-- AddForeignKey
ALTER TABLE "PriorityOrder" ADD CONSTRAINT "PriorityOrder_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderToPriorityOrder" ADD CONSTRAINT "_OrderToPriorityOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderToPriorityOrder" ADD CONSTRAINT "_OrderToPriorityOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "PriorityOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
