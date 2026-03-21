CREATE UNIQUE INDEX IF NOT EXISTS "ModelInvoice_modelId_periodStart_key" ON "ModelInvoice"("modelId", "periodStart");
CREATE INDEX IF NOT EXISTS "ModelInvoice_modelId_idx" ON "ModelInvoice"("modelId");
CREATE INDEX IF NOT EXISTS "ModelInvoice_status_idx" ON "ModelInvoice"("status");
