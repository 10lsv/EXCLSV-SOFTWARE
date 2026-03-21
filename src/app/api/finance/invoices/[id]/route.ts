import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["PAID", "OVERDUE", "DRAFT"],
  PAID: [],
  OVERDUE: ["PAID", "DRAFT"],
};

function formatPeriodLabel(start: Date, end: Date): string {
  return `${start.getDate()} - ${end.getDate()} ${format(start, "MMMM yyyy", { locale: fr })}`;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    const invoice = await prisma.modelInvoice.findUnique({
      where: { id },
      include: { model: { select: { userId: true, stageName: true } } },
    });
    if (!invoice) return jsonError("Facture introuvable", 404);

    // State machine validation
    if (body.status !== undefined) {
      const allowed = VALID_TRANSITIONS[invoice.status] ?? [];
      if (!allowed.includes(body.status)) {
        return jsonError(
          `Transition ${invoice.status} → ${body.status} non autorisée. Transitions possibles : ${allowed.join(", ") || "aucune"}`,
          422
        );
      }
    }

    // Build update data with proper timestamp management
    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "SENT") data.sentAt = new Date();
      if (body.status === "PAID") data.paidAt = new Date();
      if (body.status === "OVERDUE") data.overdueAt = new Date();
      if (body.status === "DRAFT") {
        data.sentAt = null;
        data.paidAt = null;
        data.overdueAt = null;
      }
    }

    const updated = await prisma.modelInvoice.update({
      where: { id },
      data,
    });

    // Notifications
    const periodLabel = formatPeriodLabel(invoice.periodStart, invoice.periodEnd);

    if (body.status === "SENT" && invoice.model.userId) {
      await prisma.notification.create({
        data: {
          userId: invoice.model.userId,
          type: "INVOICE_SENT",
          title: "Nouvelle facture disponible",
          message: `Votre facture pour la période ${periodLabel} est disponible.`,
          link: "/model/invoices",
        },
      });
    }

    if (body.status === "PAID" && invoice.model.userId) {
      await prisma.notification.create({
        data: {
          userId: invoice.model.userId,
          type: "INVOICE_PAID",
          title: "Facture payée",
          message: `Votre facture pour la période ${periodLabel} a été marquée comme payée.`,
          link: "/model/invoices",
        },
      });
    }

    await logAudit(session!.user.id, "UPDATE_INVOICE_STATUS", "ModelInvoice", id, {
      from: invoice.status, to: body.status,
    });

    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[INVOICE PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
