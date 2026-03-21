import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { periodStart, periodEnd } = await req.json();
    if (!periodStart || !periodEnd) return jsonError("periodStart et periodEnd requis");

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const models = await prisma.modelProfile.findMany({
      select: { id: true, stageName: true, agencyPercentage: true, ofCutPercent: true },
    });

    const invoices = [];
    const skippedNames: string[] = [];

    for (const model of models) {
      // Protect non-DRAFT invoices
      const existing = await prisma.modelInvoice.findUnique({
        where: { modelId_periodStart: { modelId: model.id, periodStart: start } },
        select: { id: true, status: true },
      });
      if (existing && existing.status !== "DRAFT") {
        skippedNames.push(model.stageName);
        continue;
      }

      const data = await prisma.inflowwDailyData.findMany({
        where: { modelId: model.id, date: { gte: start, lte: end } },
      });

      if (data.length === 0) continue;

      const subsRevenue = r2(data.reduce((s, d) => s + d.subsGross, 0));
      const tipsRevenue = r2(data.reduce((s, d) => s + d.tipsGross, 0));
      const messagesRevenue = r2(data.reduce((s, d) => s + d.messagesGross, 0));
      const postsRevenue = r2(data.reduce((s, d) => s + d.postsGross, 0));
      const streamsRevenue = r2(data.reduce((s, d) => s + d.streamsGross, 0));
      const referralsRevenue = r2(data.reduce((s, d) => s + d.referralsGross, 0));
      const grossRevenue = r2(data.reduce((s, d) => s + d.totalEarningsGross, 0));

      const ofCutPct = model.ofCutPercent ?? 20;
      const ofFees = r2(grossRevenue * (ofCutPct / 100));
      const netAfterOF = r2(grossRevenue - ofFees);
      const modelSharePct = 100 - (model.agencyPercentage ?? 50);
      const amountDue = r2(netAfterOF * (modelSharePct / 100));
      const agencyShare = r2(netAfterOF - amountDue);

      const invoiceData = {
        periodEnd: end,
        grossRevenue,
        ofCutPercent: ofCutPct,
        ofFees,
        netAfterOF,
        modelSharePercent: modelSharePct,
        netRevenue: netAfterOF,
        agencyShare,
        amountDue,
        subsRevenue,
        tipsRevenue,
        messagesRevenue,
        postsRevenue,
        streamsRevenue,
        referralsRevenue,
      };

      const invoice = await prisma.modelInvoice.upsert({
        where: { modelId_periodStart: { modelId: model.id, periodStart: start } },
        update: invoiceData,
        create: { modelId: model.id, periodStart: start, ...invoiceData },
      });

      invoices.push(invoice);
    }

    await logAudit(session!.user.id, "GENERATE_INVOICES", "ModelInvoice", undefined, {
      periodStart, periodEnd, count: invoices.length, skippedCount: skippedNames.length,
    });

    return jsonSuccess({
      generated: invoices.length,
      skipped: skippedNames.length,
      skippedNames,
    });
  } catch (err: unknown) {
    console.error("[INVOICES GENERATE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
