import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;

    const log = await prisma.importLog.findUnique({ where: { id } });
    if (!log) return jsonError("Import introuvable", 404);

    let deletedCount = 0;

    // Check if invoices/payrolls exist for this period
    const warnings: string[] = [];

    if (log.periodStart && log.periodEnd) {
      if (log.type === "MODEL" && log.modelId) {
        const invoiceCount = await prisma.modelInvoice.count({
          where: {
            modelId: log.modelId,
            periodStart: { lte: log.periodEnd },
            periodEnd: { gte: log.periodStart },
          },
        });
        if (invoiceCount > 0) {
          warnings.push(`${invoiceCount} facture(s) existante(s) devront etre regenerees.`);
        }

        // Delete associated data
        const result = await prisma.inflowwDailyData.deleteMany({
          where: {
            modelId: log.modelId,
            date: { gte: log.periodStart, lte: log.periodEnd },
          },
        });
        deletedCount = result.count;
      }

      if (log.type === "CHATTER" && log.chatterId && log.modelId) {
        const payrollCount = await prisma.chatterPayroll.count({
          where: {
            chatterId: log.chatterId,
            periodStart: { lte: log.periodEnd },
            periodEnd: { gte: log.periodStart },
          },
        });
        if (payrollCount > 0) {
          warnings.push(`${payrollCount} payroll(s) existant(s) devront etre recalcules.`);
        }

        // Delete associated data
        const result = await prisma.chatterDailyData.deleteMany({
          where: {
            chatterId: log.chatterId,
            modelId: log.modelId,
            date: { gte: log.periodStart, lte: log.periodEnd },
          },
        });
        deletedCount = result.count;
      }
    }

    // Delete the import log
    await prisma.importLog.delete({ where: { id } });

    await logAudit(session!.user.id, "DELETE_IMPORT", "ImportLog", id, {
      type: log.type, fileName: log.fileName, deletedRows: deletedCount,
    });

    return jsonSuccess({ deleted: true, deletedRows: deletedCount, warnings });
  } catch (err: unknown) {
    console.error("[IMPORT DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
