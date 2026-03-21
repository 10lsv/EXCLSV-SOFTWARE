import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";
import { getMondayUTC } from "@/lib/utils";

// GET /api/planning/my — shifts et pointages du chatter connecté pour la semaine
// TODO: clock reminder notifications
export async function GET(req: NextRequest) {
  const { error, session } = await requireRole(Role.CHATTER, Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const weekStart = req.nextUrl.searchParams.get("weekStart");
    const monday = weekStart ? new Date(weekStart) : getMondayUTC();
    const end = new Date(monday);
    end.setUTCDate(end.getUTCDate() + 7);

    const shifts = await prisma.shiftSchedule.findMany({
      where: {
        chatterId: session!.user.id,
        shiftDate: { gte: monday, lt: end },
      },
      include: { model: { select: { id: true, stageName: true } } },
      orderBy: { shiftDate: "asc" },
    });

    const clocks = await prisma.clockRecord.findMany({
      where: {
        chatterId: session!.user.id,
        shiftDate: { gte: monday, lt: end },
      },
      orderBy: { shiftDate: "asc" },
    });

    return jsonSuccess({ shifts, clocks });
  } catch (err: unknown) {
    console.error("[PLANNING MY GET]", err);
    return jsonError(
      err instanceof Error ? err.message : "Erreur interne",
      500
    );
  }
}
