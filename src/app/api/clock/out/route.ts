import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function POST(_req: NextRequest) {
  const { error, session } = await requireRole(Role.CHATTER);
  if (error) return error;

  try {
    const userId = session!.user.id;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const record = await prisma.clockRecord.findUnique({
      where: { chatterId_shiftDate: { chatterId: userId, shiftDate: today } },
    });

    if (!record) return jsonError("Pas de pointage d'arrivée aujourd'hui", 404);
    if (record.clockOut) return jsonError("Départ déjà pointé", 409);

    const updated = await prisma.clockRecord.update({
      where: { id: record.id },
      data: { clockOut: now },
    });

    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[CLOCK OUT]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
