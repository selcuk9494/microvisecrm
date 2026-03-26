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
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'Branch'
  ) THEN
    BEGIN
      ALTER TABLE "WorkOrder"
        ADD CONSTRAINT "WorkOrder_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
    END;
  END IF;
END
$$;

DO $$
BEGIN
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
