import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { periodStart, periodEnd } = await req.json();
    if (!periodStart || !periodEnd) return jsonError("periodStart et periodEnd requis");

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const models = await prisma.modelProfile.findMany({
      select: { id: true, agencyPercentage: true },
    });

    const invoices = [];

    for (const model of models) {
      const data = await prisma.inflowwDailyData.findMany({
        where: { modelId: model.id, date: { gte: start, lte: end } },
      });

      if (data.length === 0) continue;

      const subsRevenue = data.reduce((s, d) => s + d.subsGross, 0);
      const tipsRevenue = data.reduce((s, d) => s + d.tipsGross, 0);
      const messagesRevenue = data.reduce((s, d) => s + d.messagesGross, 0);
      const postsRevenue = data.reduce((s, d) => s + d.postsGross, 0);
      const streamsRevenue = data.reduce((s, d) => s + d.streamsGross, 0);
      const referralsRevenue = data.reduce((s, d) => s + d.referralsGross, 0);
      const grossRevenue = data.reduce((s, d) => s + d.totalEarningsGross, 0);

      const ofFees = grossRevenue * 0.20;
      const netRevenue = grossRevenue - ofFees;
      const modelSharePct = 100 - model.agencyPercentage;
      const amountDue = netRevenue * (modelSharePct / 100);
      const agencyShare = netRevenue - amountDue;

      const invoice = await prisma.modelInvoice.upsert({
        where: { modelId_periodStart: { modelId: model.id, periodStart: start } },
        update: {
          periodEnd: end,
          grossRevenue,
          ofFees,
          netRevenue,
          agencyShare,
          amountDue,
          subsRevenue,
          tipsRevenue,
          messagesRevenue,
          postsRevenue,
          streamsRevenue,
          referralsRevenue,
        },
        create: {
          modelId: model.id,
          periodStart: start,
          periodEnd: end,
          grossRevenue,
          ofFees,
          netRevenue,
          agencyShare,
          amountDue,
          subsRevenue,
          tipsRevenue,
          messagesRevenue,
          postsRevenue,
          streamsRevenue,
          referralsRevenue,
        },
      });

      invoices.push(invoice);
    }

    await logAudit(session!.user.id, "GENERATE_INVOICES", "ModelInvoice", undefined, {
      periodStart, periodEnd, count: invoices.length,
    });

    return jsonSuccess({ generated: invoices.length });
  } catch (err: unknown) {
    console.error("[INVOICES GENERATE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
