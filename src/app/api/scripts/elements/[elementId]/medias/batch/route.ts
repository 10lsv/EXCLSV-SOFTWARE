import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: { elementId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const { medias } = body;

    if (!Array.isArray(medias) || medias.length === 0) {
      return jsonError("medias[] requis (au moins 1)");
    }

    const lastMedia = await prisma.scriptMedia.findFirst({
      where: { elementId: params.elementId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const startOrder = lastMedia ? lastMedia.order + 1 : 0;

    const created = await prisma.$transaction(
      medias.map((m: { mediaType: string; description: string; outfit?: string; duration?: string }, i: number) =>
        prisma.scriptMedia.create({
          data: {
            elementId: params.elementId,
            mediaType: m.mediaType || "PHOTO",
            description: m.description,
            outfit: m.outfit || null,
            duration: m.duration || null,
            order: startOrder + i,
          },
        })
      )
    );

    return jsonSuccess(created, 201);
  } catch (err: unknown) {
    console.error("[MEDIAS BATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
