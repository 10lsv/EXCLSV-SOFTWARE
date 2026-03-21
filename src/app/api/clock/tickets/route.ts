import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";
import { notifyAdmins } from "@/lib/notifications";

// GET /api/clock/tickets
export async function GET(_req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN, Role.CHATTER);
  if (error) return error;

  try {
    const role = session!.user.role as Role;
    const where = role === Role.CHATTER ? { chatterId: session!.user.id } : {};

    const tickets = await prisma.clockTicket.findMany({
      where,
      include: { chatter: { select: { id: true, name: true, avatar: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    // Don't send screenshot data in list (too large)
    const data = tickets.map((t) => ({
      ...t,
      screenshotData: t.screenshotData ? "[present]" : null,
    }));

    return jsonSuccess(data);
  } catch (err: unknown) {
    console.error("[TICKETS GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// POST /api/clock/tickets — chatter declares forgotten clock
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.CHATTER);
  if (error) return error;

  try {
    const body = await req.json();
    const { shiftDate, shiftType, screenshotData, comment } = body;

    if (!shiftDate || !shiftType) return jsonError("shiftDate et shiftType requis");

    // Validate screenshot size (base64 ~= 4/3 of original, 500Ko → ~680Ko base64)
    if (screenshotData && screenshotData.length > 700000) {
      return jsonError("Screenshot trop volumineux (max 500Ko)");
    }

    const dateObj = new Date(shiftDate);
    const normalizedDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));

    const ticket = await prisma.clockTicket.create({
      data: {
        chatterId: session!.user.id,
        shiftDate: normalizedDate,
        shiftType,
        screenshotData: screenshotData || null,
        comment: comment || null,
      },
    });

    const chatterName = session!.user.name || "Un chatter";
    const dateStr = normalizedDate.toISOString().split("T")[0];
    await notifyAdmins({
      type: "CLOCK_TICKET",
      title: "Oubli de pointage",
      message: `${chatterName} a déclaré un oubli de pointage pour le ${dateStr}`,
      link: "/admin/planning",
    });

    return jsonSuccess(ticket, 201);
  } catch (err: unknown) {
    console.error("[TICKETS POST]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
