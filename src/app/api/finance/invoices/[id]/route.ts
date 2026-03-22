import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Transitions allowed per role
// Admin can do all transitions, Model can only mark SENT/OVERDUE → PAID
const ADMIN_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["PAID", "OVERDUE"],
  PAID: ["SENT"],         // admin can revert if payment not received
  OVERDUE: ["PAID", "SENT"],
};

const MODEL_TRANSITIONS: Record<string, string[]> = {
  SENT: ["PAID"],
  OVERDUE: ["PAID"],
};

function formatPeriodLabel(start: Date, end: Date): string {
  return `${start.getDate()} - ${end.getDate()} ${format(start, "MMMM yyyy", { locale: fr })}`;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Allow MODEL, OWNER, ADMIN
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();
    const userRole = session!.user.role as string;
    const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

    const invoice = await prisma.modelInvoice.findUnique({
      where: { id },
      include: { model: { select: { userId: true, stageName: true } } },
    });
    if (!invoice) return jsonError("Facture introuvable", 404);

    // MODEL can only modify their own invoices
    if (!isAdmin) {
      const mp = await prisma.modelProfile.findUnique({
        where: { userId: session!.user.id },
        select: { id: true },
      });
      if (!mp || invoice.modelId !== mp.id) {
        return jsonError("Acces interdit", 403);
      }
    }

    // State machine validation based on role
    if (body.status !== undefined) {
      const transitions = isAdmin ? ADMIN_TRANSITIONS : MODEL_TRANSITIONS;
      const allowed = transitions[invoice.status] ?? [];
      if (!allowed.includes(body.status)) {
        return jsonError(
          `Transition ${invoice.status} → ${body.status} non autorisée.`,
          422
        );
      }
    }

    // Build update data with proper timestamp management
    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "SENT") {
        data.sentAt = new Date();
        data.paidAt = null;
        data.overdueAt = null;
      }
      if (body.status === "PAID") data.paidAt = new Date();
      if (body.status === "OVERDUE") data.overdueAt = new Date();
    }

    const updated = await prisma.modelInvoice.update({
      where: { id },
      data,
    });

    // Notifications
    const periodLabel = formatPeriodLabel(invoice.periodStart, invoice.periodEnd);

    if (body.status === "SENT" && invoice.model.userId) {
      // Admin sends invoice → notify model
      await prisma.notification.create({
        data: {
          userId: invoice.model.userId,
          type: "INVOICE_SENT",
          title: "Nouvelle facture a regler",
          message: `Votre facture de $${invoice.agencyShare.toFixed(2)} pour la période ${periodLabel} est disponible.`,
          link: "/model/invoices",
        },
      });
    }

    if (body.status === "PAID" && !isAdmin) {
      // Model marks as paid → notify all admins/owners
      const admins = await prisma.user.findMany({
        where: { role: { in: ["OWNER", "ADMIN"] } },
        select: { id: true },
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: "INVOICE_PAID_BY_MODEL",
            title: `${invoice.model.stageName} a marque sa facture comme payee`,
            message: `Facture de $${invoice.agencyShare.toFixed(2)} pour la période ${periodLabel} — verifiez le virement.`,
            link: "/admin/finance",
          },
        });
      }
    }

    if (body.status === "PAID" && isAdmin && invoice.model.userId) {
      // Admin confirms payment → notify model
      await prisma.notification.create({
        data: {
          userId: invoice.model.userId,
          type: "INVOICE_CONFIRMED",
          title: "Paiement confirme",
          message: `Votre paiement pour la période ${periodLabel} a ete confirme.`,
          link: "/model/invoices",
        },
      });
    }

    await logAudit(session!.user.id, "UPDATE_INVOICE_STATUS", "ModelInvoice", id, {
      from: invoice.status, to: body.status, role: userRole,
    });

    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[INVOICE PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
