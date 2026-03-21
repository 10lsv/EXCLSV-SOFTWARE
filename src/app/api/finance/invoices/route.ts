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

    return jsonSuccess(invoices);
  } catch (err: unknown) {
    console.error("[INVOICES GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
