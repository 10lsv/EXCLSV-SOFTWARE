import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

// GET /api/clock/tickets/[id] — get ticket with screenshot
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const ticket = await prisma.clockTicket.findUnique({
      where: { id: params.id },
      include: { chatter: { select: { id: true, name: true, avatar: true } } },
    });
    if (!ticket) return jsonError("Ticket introuvable", 404);
    return jsonSuccess(ticket);
  } catch (err: unknown) {
    console.error("[TICKET GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// PATCH /api/clock/tickets/[id] — admin resolves ticket
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const { status, adminComment, adjustedClockIn, adjustedClockOut } = body;

    if (!status || (status !== "APPROVED" && status !== "REJECTED")) {
      return jsonError("status doit être APPROVED ou REJECTED");
    }

    if (status === "REJECTED" && !adminComment) {
      return jsonError("adminComment obligatoire pour un rejet");
    }

    const ticket = await prisma.clockTicket.findUnique({
      where: { id: params.id },
      include: { chatter: { select: { id: true, name: true } } },
    });
    if (!ticket) return jsonError("Ticket introuvable", 404);
    if (ticket.status !== "PENDING") return jsonError("Ticket déjà traité", 400);

    // Update ticket
    await prisma.clockTicket.update({
      where: { id: params.id },
      data: {
        status,
        adminId: session!.user.id,
        adminComment: adminComment || null,
        adjustedClockIn: adjustedClockIn ? new Date(adjustedClockIn) : null,
        adjustedClockOut: adjustedClockOut ? new Date(adjustedClockOut) : null,
        resolvedAt: new Date(),
        screenshotData: null, // Free storage
      },
    });

    if (status === "APPROVED" && adjustedClockIn) {
      // Create ClockRecord from ticket
      try {
        await prisma.clockRecord.create({
          data: {
            chatterId: ticket.chatterId,
            shiftDate: ticket.shiftDate,
            shiftType: ticket.shiftType,
            clockIn: new Date(adjustedClockIn),
            clockOut: adjustedClockOut ? new Date(adjustedClockOut) : null,
            source: "TICKET",
            ticketId: params.id,
          },
        });
      } catch {
        // If clock record already exists, update it
        const existing = await prisma.clockRecord.findUnique({
          where: { chatterId_shiftDate: { chatterId: ticket.chatterId, shiftDate: ticket.shiftDate } },
        });
        if (existing) {
          await prisma.clockRecord.update({
            where: { id: existing.id },
            data: {
              clockIn: new Date(adjustedClockIn),
              clockOut: adjustedClockOut ? new Date(adjustedClockOut) : null,
              source: "TICKET",
              ticketId: params.id,
            },
          });
        }
      }

      await createNotification({
        userId: ticket.chatterId,
        type: "TICKET_APPROVED",
        title: "Pointage approuvé",
        message: `Votre oubli de pointage du ${ticket.shiftDate.toISOString().split("T")[0]} a été approuvé.`,
        link: "/chatter/planning",
      });
    } else if (status === "REJECTED") {
      await createNotification({
        userId: ticket.chatterId,
        type: "TICKET_REJECTED",
        title: "Pointage rejeté",
        message: `Votre oubli de pointage du ${ticket.shiftDate.toISOString().split("T")[0]} a été rejeté : ${adminComment}`,
        link: "/chatter/planning",
      });
    }

    await logAudit(session!.user.id, "RESOLVE_TICKET", "ClockTicket", params.id, { status, adminComment });

    return jsonSuccess({ resolved: true });
  } catch (err: unknown) {
    console.error("[TICKET PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
