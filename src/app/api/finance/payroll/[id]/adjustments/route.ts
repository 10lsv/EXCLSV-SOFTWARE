import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;
    const adjustments = await prisma.payrollAdjustment.findMany({
      where: { payrollId: id },
      orderBy: { createdAt: "asc" },
    });
    return jsonSuccess(adjustments);
  } catch (err: unknown) {
    console.error("[PAYROLL ADJUSTMENTS GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;
    const { description, amount } = await req.json();

    if (!description || amount === undefined || typeof amount !== "number") {
      return jsonError("description (string) et amount (number) requis");
    }

    const payroll = await prisma.chatterPayroll.findUnique({ where: { id } });
    if (!payroll) return jsonError("Payroll introuvable", 404);
    if (payroll.status !== "DRAFT") {
      return jsonError("Impossible de modifier un payroll non-DRAFT", 422);
    }

    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        payrollId: id,
        description,
        amount: r2(amount),
        addedBy: session!.user.id,
      },
    });

    // Recalculate totals
    const newAdjustmentsTotal = r2(payroll.adjustmentsTotal + r2(amount));
    const newTotalPay = r2(payroll.baseSalary + payroll.commissionAmount + newAdjustmentsTotal);

    await prisma.chatterPayroll.update({
      where: { id },
      data: { adjustmentsTotal: newAdjustmentsTotal, totalPay: newTotalPay },
    });

    await logAudit(session!.user.id, "ADD_PAYROLL_ADJUSTMENT", "PayrollAdjustment", adjustment.id, {
      payrollId: id, description, amount,
    });

    return jsonSuccess(adjustment, 201);
  } catch (err: unknown) {
    console.error("[PAYROLL ADJUSTMENT POST]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
