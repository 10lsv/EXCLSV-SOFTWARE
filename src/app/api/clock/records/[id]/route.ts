import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const updated = await prisma.clockRecord.update({
      where: { id: params.id },
      data: {
        ...(body.clockIn !== undefined && { clockIn: new Date(body.clockIn) }),
        ...(body.clockOut !== undefined && { clockOut: body.clockOut ? new Date(body.clockOut) : null }),
      },
    });

    await logAudit(session!.user.id, "UPDATE_CLOCK_RECORD", "ClockRecord", params.id, { fields: Object.keys(body) });
    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[CLOCK RECORD PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    await prisma.clockRecord.delete({ where: { id: params.id } });
    await logAudit(session!.user.id, "DELETE_CLOCK_RECORD", "ClockRecord", params.id);
    return jsonSuccess({ deleted: true });
  } catch (err: unknown) {
    console.error("[CLOCK RECORD DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
