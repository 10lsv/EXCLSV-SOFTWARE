import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

const shiftInclude = {
  chatter: { select: { id: true, name: true, avatar: true } },
  model: { select: { id: true, stageName: true, photoUrl: true } },
};

// GET /api/planning
export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const weekStart = req.nextUrl.searchParams.get("weekStart");
    const chatterId = req.nextUrl.searchParams.get("chatterId");

    if (!weekStart) return jsonError("weekStart requis");

    const start = new Date(weekStart);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);

    const where: Record<string, unknown> = { shiftDate: { gte: start, lt: end } };
    if (chatterId) where.chatterId = chatterId;

    const shifts = await prisma.shiftSchedule.findMany({
      where,
      include: shiftInclude,
      orderBy: [{ shiftDate: "asc" }, { shiftType: "asc" }],
    });

    const clocks = await prisma.clockRecord.findMany({
      where: { shiftDate: { gte: start, lt: end } },
      include: { chatter: { select: { id: true, name: true } } },
      orderBy: { shiftDate: "asc" },
    });

    // Also get all chatters and models for the assign dialog
    const chatters = await prisma.user.findMany({
      where: { role: { in: ["CHATTER"] } },
      select: { id: true, name: true, avatar: true },
      orderBy: { name: "asc" },
    });

    const models = await prisma.modelProfile.findMany({
      select: { id: true, stageName: true, photoUrl: true },
      orderBy: { stageName: "asc" },
    });

    // Get assignments for filtering models per chatter
    const assignments = await prisma.chatterAssignment.findMany({
      where: { isActive: true },
      select: { chatterId: true, modelId: true },
    });

    // Map chatterProfile.id → user.id for assignments
    const chatterProfiles = await prisma.chatterProfile.findMany({
      select: { id: true, userId: true },
    });
    const profileToUser = new Map(chatterProfiles.map((cp) => [cp.id, cp.userId]));

    const assignmentsByUser = new Map<string, string[]>();
    for (const a of assignments) {
      const userId = profileToUser.get(a.chatterId);
      if (!userId) continue;
      const existing = assignmentsByUser.get(userId) || [];
      existing.push(a.modelId);
      assignmentsByUser.set(userId, existing);
    }

    return jsonSuccess({
      shifts,
      clocks,
      chatters,
      models,
      assignments: Object.fromEntries(assignmentsByUser),
      weekStart: start.toISOString(),
    });
  } catch (err: unknown) {
    console.error("[PLANNING GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// POST /api/planning
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const { chatterId, shiftDate, shiftType, modelIds, note } = body;

    if (!chatterId || !shiftDate || !shiftType) {
      return jsonError("chatterId, shiftDate et shiftType requis");
    }

    const dateObj = new Date(shiftDate);
    const normalizedDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));

    // If modelIds provided, create one shift per model
    const mIds: (string | null)[] = Array.isArray(modelIds) && modelIds.length > 0
      ? modelIds
      : [null];

    const created = [];
    for (const modelId of mIds) {
      try {
        const shift = await prisma.shiftSchedule.create({
          data: {
            chatterId,
            shiftDate: normalizedDate,
            shiftType,
            modelId: modelId || null,
            note: note || null,
          },
          include: shiftInclude,
        });
        created.push(shift);
      } catch {
        // Skip duplicates
      }
    }

    await logAudit(session!.user.id, "CREATE_SHIFT", "ShiftSchedule", undefined, {
      chatterId, shiftDate, shiftType, modelIds: mIds, count: created.length,
    });

    return jsonSuccess(created, 201);
  } catch (err: unknown) {
    console.error("[PLANNING POST]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
