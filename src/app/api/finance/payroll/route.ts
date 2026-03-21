import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const periodStart = req.nextUrl.searchParams.get("periodStart");
    const chatterId = req.nextUrl.searchParams.get("chatterId");

    const where: Record<string, unknown> = {};
    if (periodStart) where.periodStart = new Date(periodStart);
    if (chatterId) where.chatterId = chatterId;

    const payrolls = await prisma.chatterPayroll.findMany({
      where,
      include: { chatter: { select: { id: true, name: true, avatar: true } } },
      orderBy: { periodStart: "desc" },
    });

    return jsonSuccess(payrolls);
  } catch (err: unknown) {
    console.error("[PAYROLL GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
