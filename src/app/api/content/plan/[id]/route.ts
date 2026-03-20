import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// DELETE /api/content/plan/[id] — retirer une entrée du planning
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const entry = await prisma.contentPlanEntry.findUnique({
    where: { id: params.id },
    include: {
      task: {
        include: { model: { select: { userId: true } } },
      },
    },
  });

  if (!entry) return jsonError("Entrée introuvable", 404);

  // Vérifier que la modèle ne supprime que ses propres entrées
  if (session!.user.role === "MODEL" && entry.task.model.userId !== session!.user.id) {
    return jsonError("Accès interdit", 403);
  }

  await prisma.contentPlanEntry.delete({ where: { id: params.id } });

  return jsonSuccess({ deleted: true });
}
