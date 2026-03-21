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
    const updated = await prisma.shiftSchedule.update({
      where: { id: params.id },
      data: {
        ...(body.chatterId !== undefined && { chatterId: body.chatterId }),
        ...(body.shiftType !== undefined && { shiftType: body.shiftType }),
        ...(body.note !== undefined && { note: body.note || null }),
      },
      include: { chatter: { select: { id: true, name: true, avatar: true } } },
    });

    await logAudit(session!.user.id, "UPDATE_SHIFT", "ShiftSchedule", params.id, { fields: Object.keys(body) });
    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[PLANNING PATCH]", err);
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
    await prisma.shiftSchedule.delete({ where: { id: params.id } });
    await logAudit(session!.user.id, "DELETE_SHIFT", "ShiftSchedule", params.id);
    return jsonSuccess({ deleted: true });
  } catch (err: unknown) {
    console.error("[PLANNING DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
