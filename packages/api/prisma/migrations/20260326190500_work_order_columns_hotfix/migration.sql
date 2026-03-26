DO $$
BEGIN
  BEGIN
    ALTER TABLE "WorkOrder" ADD COLUMN "branchId" TEXT;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE "WorkOrder" ADD COLUMN "dueDate" TIMESTAMP(3);
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE "WorkOrder" ADD COLUMN "locationAddress" TEXT;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE "WorkOrder" ADD COLUMN "locationLat" DOUBLE PRECISION;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE "WorkOrder" ADD COLUMN "locationLng" DOUBLE PRECISION;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  BEGIN
    CREATE INDEX "WorkOrder_branchId_idx" ON "WorkOrder"("branchId");
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;

  BEGIN
    CREATE INDEX "WorkOrder_dueDate_idx" ON "WorkOrder"("dueDate");
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;
END
$$;
