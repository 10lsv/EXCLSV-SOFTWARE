import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const type = req.nextUrl.searchParams.get("type");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    const logs = await prisma.importLog.findMany({
      where,
      include: {
        model: { select: { id: true, stageName: true, photoUrl: true } },
        chatter: { select: { id: true, name: true } },
        importedByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    return jsonSuccess(logs);
  } catch (err: unknown) {
    console.error("[IMPORTS GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
