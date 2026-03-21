import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { id } = await params;

    const mp = await prisma.modelProfile.findUnique({
      where: { userId: session!.user.id },
      select: { id: true },
    });

    const isAdmin = ["OWNER", "ADMIN"].includes(session!.user.role as string);

    const invoice = await prisma.modelInvoice.findUnique({
      where: { id },
      include: { model: { select: { id: true, stageName: true, photoUrl: true } } },
    });

    if (!invoice) return jsonError("Facture introuvable", 404);

    // Data isolation: MODEL can only see their own
    if (!isAdmin && invoice.modelId !== mp?.id) {
      return jsonError("Acces interdit", 403);
    }

    // Only show SENT or PAID to MODEL role
    if (!isAdmin && !["SENT", "PAID"].includes(invoice.status)) {
      return jsonError("Facture non disponible", 403);
    }

    // Fetch daily breakdown
    const dailyBreakdown = await prisma.inflowwDailyData.findMany({
      where: {
        modelId: invoice.modelId,
        date: { gte: invoice.periodStart, lte: invoice.periodEnd },
      },
      orderBy: { date: "asc" },
      select: {
        date: true,
        subsGross: true,
        tipsGross: true,
        messagesGross: true,
        postsGross: true,
        streamsGross: true,
        referralsGross: true,
        totalEarningsGross: true,
      },
    });

    return jsonSuccess({ ...invoice, dailyBreakdown });
  } catch (err: unknown) {
    console.error("[INVOICE MY DETAIL]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
