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
    const updated = await prisma.modelInvoice.update({
      where: { id: params.id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.status === "SENT" && { sentAt: new Date() }),
        ...(body.status === "PAID" && { paidAt: new Date() }),
      },
    });
    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[INVOICE PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
