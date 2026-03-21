import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const { sourceWeekStart, targetWeekStart } = body;

    if (!sourceWeekStart || !targetWeekStart) {
      return jsonError("sourceWeekStart et targetWeekStart requis");
    }

    const srcStart = new Date(sourceWeekStart);
    const srcEnd = new Date(srcStart);
    srcEnd.setUTCDate(srcEnd.getUTCDate() + 7);

    const tgtStart = new Date(targetWeekStart);

    const sourceShifts = await prisma.shiftSchedule.findMany({
      where: { shiftDate: { gte: srcStart, lt: srcEnd } },
    });

    let created = 0;
    for (const shift of sourceShifts) {
      const dayOffset = Math.round((shift.shiftDate.getTime() - srcStart.getTime()) / (86400000));
      const targetDate = new Date(tgtStart);
      targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);

      try {
        await prisma.shiftSchedule.create({
          data: {
            chatterId: shift.chatterId,
            shiftDate: targetDate,
            shiftType: shift.shiftType,
            note: shift.note,
          },
        });
        created++;
      } catch {
        // Skip duplicates (unique constraint)
      }
    }

    await logAudit(session!.user.id, "DUPLICATE_WEEK", "ShiftSchedule", undefined, {
      sourceWeekStart, targetWeekStart, created,
    });

    return jsonSuccess({ created, sourceCount: sourceShifts.length });
  } catch (err: unknown) {
    console.error("[PLANNING DUPLICATE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
