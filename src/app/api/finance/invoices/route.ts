import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const modelId = req.nextUrl.searchParams.get("modelId");
    const status = req.nextUrl.searchParams.get("status");
    const periodStart = req.nextUrl.searchParams.get("periodStart");

    const where: Record<string, unknown> = {};
    if (modelId) where.modelId = modelId;
    if (status) where.status = status;
    if (periodStart) where.periodStart = new Date(periodStart);

    const invoices = await prisma.modelInvoice.findMany({
      where,
      include: { model: { select: { id: true, stageName: true, photoUrl: true, agencyPercentage: true } } },
      orderBy: { periodStart: "desc" },
    });

    // Compute totals
    const totals = {
      gross: invoices.reduce((s, i) => s + i.grossRevenue, 0),
      modelNet: invoices.reduce((s, i) => s + i.amountDue, 0),
      agencyNet: invoices.reduce((s, i) => s + i.agencyShare, 0),
    };

    // Previous period totals for trend
    let previousTotals: { gross: number; modelNet: number; agencyNet: number } | null = null;

    if (periodStart) {
      const currentStart = new Date(periodStart);
      const day = currentStart.getDate();
      let prevStart: Date;

      if (day === 1) {
        // Current is 1-15, previous is 16-end of previous month
        const prevMonth = new Date(currentStart);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        prevStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 16);
      } else {
        // Current is 16-end, previous is 1-15 of same month
        prevStart = new Date(currentStart.getFullYear(), currentStart.getMonth(), 1);
      }

      const prevInvoices = await prisma.modelInvoice.findMany({
        where: { periodStart: prevStart },
        select: { grossRevenue: true, amountDue: true, agencyShare: true },
      });

      if (prevInvoices.length > 0) {
        previousTotals = {
          gross: prevInvoices.reduce((s, i) => s + i.grossRevenue, 0),
          modelNet: prevInvoices.reduce((s, i) => s + i.amountDue, 0),
          agencyNet: prevInvoices.reduce((s, i) => s + i.agencyShare, 0),
        };
      }
    }

    // Period incomplete flag
    let periodIncomplete = false;
    if (periodStart) {
      const periodEnd = req.nextUrl.searchParams.get("periodEnd");
      if (periodEnd) {
        const endDate = new Date(periodEnd);
        periodIncomplete = endDate >= new Date();
      }
    }

    return jsonSuccess({ invoices, totals, previousTotals, periodIncomplete });
  } catch (err: unknown) {
    console.error("[INVOICES GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
