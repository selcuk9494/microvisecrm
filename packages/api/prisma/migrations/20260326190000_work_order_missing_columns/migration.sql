ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "locationAddress" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "locationLat" DOUBLE PRECISION;
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "locationLng" DOUBLE PRECISION;

DO $$
BEGIN
  IF to_regclass('"Branch"') IS NOT NULL THEN
    BEGIN
      ALTER TABLE "WorkOrder"
        ADD CONSTRAINT "WorkOrder_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "WorkOrder_branchId_idx" ON "WorkOrder"("branchId");
CREATE INDEX IF NOT EXISTS "WorkOrder_dueDate_idx" ON "WorkOrder"("dueDate");
