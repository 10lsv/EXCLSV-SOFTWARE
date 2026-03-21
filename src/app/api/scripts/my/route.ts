import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// GET /api/scripts/my — validated scripts for the connected model
export async function GET(_req: NextRequest) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const mp = await prisma.modelProfile.findUnique({
    where: { userId: session!.user.id },
    select: { id: true },
  });
  if (!mp) return jsonError("Profil modèle introuvable", 404);

  const scripts = await prisma.script.findMany({
    where: { modelId: mp.id, status: "VALIDATED" },
    include: {
      _count: { select: { contentTasks: true } },
      contentTasks: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonSuccess(
    scripts.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      contentTotal: s._count.contentTasks,
      contentDone: s.contentTasks.filter((t) => t.status === "COMPLETED").length,
      createdAt: s.createdAt,
    }))
  );
}
