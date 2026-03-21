import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// POST — add element to step
export async function POST(
  req: NextRequest,
  { params }: { params: { stepId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const lastEl = await prisma.scriptElement.findFirst({
      where: { stepId: params.stepId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const element = await prisma.scriptElement.create({
      data: {
        stepId: params.stepId,
        type: body.type,
        order: lastEl ? lastEl.order + 1 : 0,
        messageText: body.messageText || null,
        waitDescription: body.waitDescription || null,
        noteText: body.noteText || null,
        price: body.price ? parseFloat(String(body.price)) : null,
      },
      include: { medias: true },
    });

    return jsonSuccess(element, 201);
  } catch (err: unknown) {
    console.error("[ELEMENTS POST]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// PUT — reorder elements in step
export async function PUT(
  req: NextRequest,
  { params }: { params: { stepId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { elementIds } = await req.json();
    if (!Array.isArray(elementIds)) return jsonError("elementIds requis");

    for (let i = 0; i < elementIds.length; i++) {
      await prisma.scriptElement.updateMany({
        where: { id: elementIds[i], stepId: params.stepId },
        data: { order: i },
      });
    }

    return jsonSuccess({ reordered: elementIds.length });
  } catch (err: unknown) {
    console.error("[ELEMENTS REORDER]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
