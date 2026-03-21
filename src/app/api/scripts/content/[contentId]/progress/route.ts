import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";
import { notifyAdmins } from "@/lib/notifications";

// PATCH /api/scripts/content/[contentId]/progress — model updates content status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { contentId: string } }
) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const task = await prisma.scriptContentTask.findUnique({
    where: { id: params.contentId },
    include: { script: { select: { id: true, name: true, modelId: true } } },
  });
  if (!task) return jsonError("Contenu introuvable", 404);

  // Model can only update their own
  if (session!.user.role === "MODEL") {
    const mp = await prisma.modelProfile.findUnique({
      where: { userId: session!.user.id },
      select: { id: true },
    });
    if (!mp || mp.id !== task.modelId) return jsonError("Accès interdit", 403);
  }

  const body = await req.json();
  const updated = await prisma.scriptContentTask.update({
    where: { id: params.contentId },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.driveLink !== undefined && { driveLink: body.driveLink }),
    },
  });

  // Check if all content tasks for this script are completed
  if (body.status === "COMPLETED") {
    const allTasks = await prisma.scriptContentTask.findMany({
      where: { scriptId: task.script.id },
      select: { status: true },
    });
    const allDone = allTasks.every((t) => t.status === "COMPLETED");
    if (allDone) {
      await notifyAdmins({
        type: "SCRIPT_READY",
        title: "Script prêt",
        message: `Tous les contenus du script "${task.script.name}" ont été produits.`,
        link: `/admin/scripts/${task.script.id}`,
      });
    }
  }

  return jsonSuccess(updated);
}
