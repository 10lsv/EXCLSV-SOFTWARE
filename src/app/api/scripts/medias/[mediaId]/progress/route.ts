import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";
import { notifyAdmins } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const media = await prisma.scriptMedia.findUnique({
      where: { id: params.mediaId },
      include: {
        element: {
          include: { step: { include: { script: { select: { id: true, name: true, modelId: true } } } } },
        },
      },
    });
    if (!media) return jsonError("Média introuvable", 404);

    // Model can only update their own
    if (session!.user.role === "MODEL") {
      const mp = await prisma.modelProfile.findUnique({
        where: { userId: session!.user.id },
        select: { id: true },
      });
      if (!mp || mp.id !== media.element.step.script.modelId) {
        return jsonError("Accès interdit", 403);
      }
    }

    const body = await req.json();
    const updated = await prisma.scriptMedia.update({
      where: { id: params.mediaId },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.driveLink !== undefined && { driveLink: body.driveLink }),
      },
    });

    // Check if ALL medias of the script are completed
    if (body.status === "COMPLETED") {
      const scriptId = media.element.step.script.id;
      const allMedias = await prisma.scriptMedia.findMany({
        where: {
          element: { step: { scriptId } },
        },
        select: { status: true },
      });

      if (allMedias.length > 0 && allMedias.every((m) => m.status === "COMPLETED")) {
        await notifyAdmins({
          type: "SCRIPT_READY",
          title: "Script prêt",
          message: `Tous les contenus du script "${media.element.step.script.name}" ont été produits.`,
          link: `/admin/scripts/${scriptId}`,
        });
      }
    }

    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[MEDIA PROGRESS]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
