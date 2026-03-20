import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, requireRole } from "@/lib/api-utils";

// GET /api/customs/stats — KPI analytics for admin customs page
export async function GET(_req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  // Début de la semaine (lundi)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  // Début du mois
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    customsThisWeek,
    , // customsThisMonth (unused, identical to totalThisMonth)
    completedThisMonth,
    totalThisMonth,
    revenueThisMonth,
    remainingToCollect,
    completedCustomsForAvg,
  ] = await Promise.all([
    // Customs créés cette semaine
    prisma.customContent.count({
      where: { createdAt: { gte: monday } },
    }),
    // Customs créés ce mois
    prisma.customContent.count({
      where: { createdAt: { gte: monthStart } },
    }),
    // Customs COMPLETED ce mois
    prisma.customContent.count({
      where: { createdAt: { gte: monthStart }, status: "COMPLETED" },
    }),
    // Total customs ce mois (pour le taux)
    prisma.customContent.count({
      where: { createdAt: { gte: monthStart } },
    }),
    // Revenus customs ce mois (somme totalPrice)
    prisma.customContent.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { totalPrice: true },
    }),
    // Reste à collecter sur customs non terminés
    prisma.customContent.aggregate({
      where: { status: { not: "COMPLETED" } },
      _sum: { totalPrice: true, amountCollected: true },
    }),
    // Customs complétés avec dates pour calcul temps moyen
    prisma.customContent.findMany({
      where: { status: "COMPLETED", updatedAt: { not: undefined } },
      select: { createdAt: true, updatedAt: true },
      take: 100,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Calcul temps moyen de production (heures)
  let avgProductionHours: number | null = null;
  if (completedCustomsForAvg.length > 0) {
    const totalMs = completedCustomsForAvg.reduce((sum, c) => {
      return sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime());
    }, 0);
    avgProductionHours = Math.round(totalMs / completedCustomsForAvg.length / 3600000);
  }

  // Taux de complétion
  const completionRate = totalThisMonth > 0
    ? Math.round((completedThisMonth / totalThisMonth) * 100)
    : 0;

  // Reste à collecter
  const totalPriceSum = remainingToCollect._sum.totalPrice || 0;
  const collectedSum = remainingToCollect._sum.amountCollected || 0;
  const remaining = Math.max(0, totalPriceSum - collectedSum);

  return jsonSuccess({
    customsThisWeek,
    revenueThisMonth: revenueThisMonth._sum.totalPrice || 0,
    avgProductionHours,
    completionRate,
    completedThisMonth,
    totalThisMonth,
    remainingToCollect: remaining,
  });
}
