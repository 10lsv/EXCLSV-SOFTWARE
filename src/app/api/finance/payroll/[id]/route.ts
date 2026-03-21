import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["VALIDATED"],
  VALIDATED: ["PAID", "DRAFT"],
  PAID: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    // Validate status transition if status is being changed
    if (body.status !== undefined) {
      const payroll = await prisma.chatterPayroll.findUnique({ where: { id } });
      if (!payroll) return jsonError("Payroll introuvable", 404);

      const allowed = VALID_TRANSITIONS[payroll.status] ?? [];
      if (!allowed.includes(body.status)) {
        return jsonError(
          `Transition ${payroll.status} → ${body.status} non autorisée. Transitions possibles : ${allowed.join(", ") || "aucune"}`,
          422
        );
      }
    }

    const updated = await prisma.chatterPayroll.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.totalHours !== undefined && { totalHours: body.totalHours }),
        ...(body.baseSalary !== undefined && { baseSalary: body.baseSalary }),
        ...(body.commissionAmount !== undefined && { commissionAmount: body.commissionAmount }),
        ...(body.totalPay !== undefined && { totalPay: body.totalPay }),
      },
    });
    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[PAYROLL PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
