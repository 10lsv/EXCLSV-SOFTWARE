import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function GET(_req: NextRequest) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const mp = await prisma.modelProfile.findUnique({
      where: { userId: session!.user.id },
      select: { id: true },
    });
    if (!mp) return jsonError("Profil modèle introuvable", 404);

    const invoices = await prisma.modelInvoice.findMany({
      where: { modelId: mp.id, status: { in: ["SENT", "PAID"] } },
      orderBy: { periodStart: "desc" },
    });

    return jsonSuccess(invoices);
  } catch (err: unknown) {
    console.error("[INVOICES MY]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
