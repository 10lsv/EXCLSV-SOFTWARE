import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const updated = await prisma.chatterPayroll.update({
      where: { id: params.id },
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
