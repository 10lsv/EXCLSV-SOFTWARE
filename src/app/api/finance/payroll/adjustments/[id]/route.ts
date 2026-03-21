import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;

    const adjustment = await prisma.payrollAdjustment.findUnique({
      where: { id },
      include: { payroll: true },
    });
    if (!adjustment) return jsonError("Ajustement introuvable", 404);
    if (adjustment.payroll.status !== "DRAFT") {
      return jsonError("Impossible de modifier un payroll non-DRAFT", 422);
    }

    await prisma.payrollAdjustment.delete({ where: { id } });

    // Recalculate
    const newAdjustmentsTotal = r2(adjustment.payroll.adjustmentsTotal - adjustment.amount);
    const newTotalPay = r2(adjustment.payroll.baseSalary + adjustment.payroll.commissionAmount + newAdjustmentsTotal);

    await prisma.chatterPayroll.update({
      where: { id: adjustment.payrollId },
      data: { adjustmentsTotal: newAdjustmentsTotal, totalPay: newTotalPay },
    });

    await logAudit(session!.user.id, "DELETE_PAYROLL_ADJUSTMENT", "PayrollAdjustment", id, {
      payrollId: adjustment.payrollId, description: adjustment.description, amount: adjustment.amount,
    });

    return jsonSuccess({ deleted: true });
  } catch (err: unknown) {
    console.error("[PAYROLL ADJUSTMENT DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
