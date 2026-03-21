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

    const scripts = await prisma.script.findMany({
      where: { modelId: mp.id, status: "VALIDATED" },
      include: {
        steps: {
          include: {
            elements: { include: { medias: { select: { status: true } } } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return jsonSuccess(
      scripts.map((s) => {
        const allMedias = s.steps.flatMap((st) =>
          st.elements.flatMap((el) => el.medias)
        );
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          description: s.description,
          totalMedias: allMedias.length,
          completedMedias: allMedias.filter((m) => m.status === "COMPLETED").length,
          createdAt: s.createdAt,
        };
      })
    );
  } catch (err: unknown) {
    console.error("[SCRIPTS MY]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
