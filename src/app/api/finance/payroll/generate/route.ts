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

    const chatters = await prisma.user.findMany({
      where: { role: "CHATTER" },
      include: { chatterProfile: { select: { hourlyRate: true, commissionRate: true } } },
    });

    const payrolls = [];

    for (const chatter of chatters) {
      const profile = chatter.chatterProfile;
      if (!profile) continue;

      // Hours from ClockRecord
      const clocks = await prisma.clockRecord.findMany({
        where: { chatterId: chatter.id, shiftDate: { gte: start, lte: end }, clockOut: { not: null } },
      });

      const totalMinutes = clocks.reduce((sum, c) => {
        if (!c.clockOut) return sum;
        return sum + (c.clockOut.getTime() - c.clockIn.getTime()) / 60000;
      }, 0);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

      // Commission from ChatterDailyData
      const dailyData = await prisma.chatterDailyData.findMany({
        where: { chatterId: chatter.id, date: { gte: start, lte: end } },
      });

      const tipsMessagesGenerated = dailyData.reduce((sum, d) => sum + d.tipsGross + d.messagesGross, 0);

      const hourlyRate = profile.hourlyRate;
      const commissionPercent = profile.commissionRate;
      const baseSalary = Math.round(totalHours * hourlyRate * 100) / 100;
      const commissionAmount = Math.round(tipsMessagesGenerated * (commissionPercent / 100) * 100) / 100;
      const totalPay = Math.round((baseSalary + commissionAmount) * 100) / 100;

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
          tipsMessagesGenerated, commissionPercent, commissionAmount, totalPay,
        },
      });

      payrolls.push(payroll);
    }

    await logAudit(session!.user.id, "GENERATE_PAYROLL", "ChatterPayroll", undefined, {
      periodStart, periodEnd, count: payrolls.length,
    });

    return jsonSuccess({ generated: payrolls.length });
  } catch (err: unknown) {
    console.error("[PAYROLL GENERATE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
