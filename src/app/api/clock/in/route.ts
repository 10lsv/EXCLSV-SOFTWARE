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

    // Find today's shift (any model)
    const shift = await prisma.shiftSchedule.findFirst({
      where: { chatterId: userId, shiftDate: today },
    });

    if (!shift) return jsonError("Pas de shift planifié aujourd'hui", 404);

    // Check if already clocked in
    const existing = await prisma.clockRecord.findUnique({
      where: { chatterId_shiftDate: { chatterId: userId, shiftDate: today } },
    });

    if (existing) return jsonError("Déjà pointé aujourd'hui", 409);

    const record = await prisma.clockRecord.create({
      data: {
        chatterId: userId,
        shiftDate: today,
        shiftType: shift.shiftType,
        clockIn: now,
        source: "CLOCK",
      },
    });

    return jsonSuccess(record, 201);
  } catch (err: unknown) {
    console.error("[CLOCK IN]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
