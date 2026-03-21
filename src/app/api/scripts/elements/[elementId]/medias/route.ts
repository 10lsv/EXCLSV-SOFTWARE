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
    if (!body.mediaType || !body.description) {
      return jsonError("mediaType et description requis");
    }

    const lastMedia = await prisma.scriptMedia.findFirst({
      where: { elementId: params.elementId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const media = await prisma.scriptMedia.create({
      data: {
        elementId: params.elementId,
        mediaType: body.mediaType,
        description: body.description,
        outfit: body.outfit || null,
        duration: body.duration || null,
        order: lastMedia ? lastMedia.order + 1 : 0,
      },
    });

    return jsonSuccess(media, 201);
  } catch (err: unknown) {
    console.error("[MEDIAS POST]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
