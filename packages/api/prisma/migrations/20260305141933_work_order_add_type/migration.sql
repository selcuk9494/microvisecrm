-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "typeId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "WorkOrderType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
