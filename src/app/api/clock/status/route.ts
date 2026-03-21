import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";
import { SHIFTS, AUTO_CLOSE_DELAY, type ShiftType } from "@/lib/shifts";

export async function GET(_req: NextRequest) {
  const { error, session } = await requireRole(Role.CHATTER, Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const userId = session!.user.id;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const shift = await prisma.shiftSchedule.findFirst({
      where: { chatterId: userId, shiftDate: today },
    });

    let clock = await prisma.clockRecord.findUnique({
      where: { chatterId_shiftDate: { chatterId: userId, shiftDate: today } },
    });

    // Lazy auto-close: if clocked in but shift ended + grace period passed
    if (clock && clock.clockIn && !clock.clockOut && shift) {
      const shiftConfig = SHIFTS[shift.shiftType as ShiftType];
      if (shiftConfig) {
        let endHour = shiftConfig.end;
        if (endHour < shiftConfig.start) endHour += 24; // crosses midnight
        const shiftEnd = new Date(today);
        shiftEnd.setUTCHours(endHour, AUTO_CLOSE_DELAY, 0, 0);

        if (now > shiftEnd) {
          const theoreticalEnd = new Date(today);
          theoreticalEnd.setUTCHours(shiftConfig.end < shiftConfig.start ? shiftConfig.end + 24 : shiftConfig.end, 0, 0, 0);

          clock = await prisma.clockRecord.update({
            where: { id: clock.id },
            data: { clockOut: theoreticalEnd, autoCloseAt: now },
          });
        }
      }
    }

    return jsonSuccess({
      shift: shift ? { id: shift.id, shiftType: shift.shiftType, shiftDate: shift.shiftDate } : null,
      clock: clock ? { id: clock.id, clockIn: clock.clockIn, clockOut: clock.clockOut, autoCloseAt: clock.autoCloseAt } : null,
    });
  } catch (err: unknown) {
    console.error("[CLOCK STATUS]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
