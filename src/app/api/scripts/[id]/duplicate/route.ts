import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const source = await prisma.script.findUnique({
      where: { id: params.id },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: {
            elements: {
              orderBy: { order: "asc" },
              include: { medias: { orderBy: { order: "asc" } } },
            },
          },
        },
      },
    });

    if (!source) return jsonError("Script introuvable", 404);

    const copy = await prisma.script.create({
      data: {
        name: `${source.name} (copie)`,
        modelId: body.modelId || source.modelId,
        category: source.category,
        description: source.description,
        tags: source.tags,
        status: "DRAFT",
        steps: {
          create: source.steps.map((step) => ({
            title: step.title,
            order: step.order,
            elements: {
              create: step.elements.map((el) => ({
                type: el.type,
                order: el.order,
                messageText: el.messageText,
                waitDescription: el.waitDescription,
                noteText: el.noteText,
                price: el.price,
                medias: {
                  create: el.medias.map((m) => ({
                    mediaType: m.mediaType,
                    description: m.description,
                    outfit: m.outfit,
                    duration: m.duration,
                    order: m.order,
                    status: "NOT_STARTED",
                  })),
                },
              })),
            },
          })),
        },
      },
    });

    await logAudit(session!.user.id, "DUPLICATE_SCRIPT", "Script", copy.id, { sourceId: params.id });
    return jsonSuccess(copy, 201);
  } catch (err: unknown) {
    console.error("[SCRIPT DUPLICATE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
