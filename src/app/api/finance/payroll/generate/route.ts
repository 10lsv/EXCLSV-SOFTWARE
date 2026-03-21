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

    const chatters = await prisma.user.findMany({
      where: { role: "CHATTER" },
      include: { chatterProfile: { select: { hourlyRate: true, commissionRate: true } } },
    });

    const payrolls = [];
    const skippedNames: string[] = [];

    for (const chatter of chatters) {
      const profile = chatter.chatterProfile;
      if (!profile) continue;

      // Protect non-DRAFT payrolls
      const existing = await prisma.chatterPayroll.findUnique({
        where: { chatterId_periodStart: { chatterId: chatter.id, periodStart: start } },
        select: { id: true, status: true, adjustmentsTotal: true },
      });
      if (existing && existing.status !== "DRAFT") {
        skippedNames.push(chatter.name);
        continue;
      }

      // Hours from ClockRecord
      const clocks = await prisma.clockRecord.findMany({
        where: { chatterId: chatter.id, shiftDate: { gte: start, lte: end }, clockOut: { not: null } },
      });

      const totalMinutes = clocks.reduce((sum, c) => {
        if (!c.clockOut) return sum;
        return sum + (c.clockOut.getTime() - c.clockIn.getTime()) / 60000;
      }, 0);
      const totalHours = r2(totalMinutes / 60);

      // Commission from ChatterDailyData
      const dailyData = await prisma.chatterDailyData.findMany({
        where: { chatterId: chatter.id, date: { gte: start, lte: end } },
      });

      const tipsMessagesGenerated = r2(dailyData.reduce((sum, d) => sum + d.tipsGross + d.messagesGross, 0));

      const hourlyRate = profile.hourlyRate;
      const commissionPercent = profile.commissionRate;
      const baseSalary = r2(totalHours * hourlyRate);
      const commissionAmount = r2(tipsMessagesGenerated * (commissionPercent / 100));
      const adjustmentsTotal = existing?.adjustmentsTotal ?? 0;
      const totalPay = r2(baseSalary + commissionAmount + adjustmentsTotal);

      if (totalHours === 0 && tipsMessagesGenerated === 0) continue;

      const payroll = await prisma.chatterPayroll.upsert({
        where: { chatterId_periodStart: { chatterId: chatter.id, periodStart: start } },
        update: {
          periodEnd: end, totalHours, hourlyRate, baseSalary,
          tipsMessagesGenerated, commissionPercent, commissionAmount, totalPay,
        },
        create: {
          chatterId: chatter.id, periodStart: start, periodEnd: end,
          totalHours, hourlyRate, baseSalary,
          tipsMessagesGenerated, commissionPercent, commissionAmount,
          adjustmentsTotal: 0, totalPay,
        },
      });

      payrolls.push(payroll);
    }

    await logAudit(session!.user.id, "GENERATE_PAYROLL", "ChatterPayroll", undefined, {
      periodStart, periodEnd, count: payrolls.length, skippedCount: skippedNames.length,
    });

    return jsonSuccess({
      generated: payrolls.length,
      skipped: skippedNames.length,
      skippedNames,
    });
  } catch (err: unknown) {
    console.error("[PAYROLL GENERATE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
