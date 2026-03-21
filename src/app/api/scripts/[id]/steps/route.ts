import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// POST /api/scripts/[id]/steps — create step with optional elements
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const { title, elements } = body;

    const lastStep = await prisma.scriptStep.findFirst({
      where: { scriptId: params.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = body.order ?? (lastStep ? lastStep.order + 1 : 0);

    const step = await prisma.scriptStep.create({
      data: {
        scriptId: params.id,
        title: title || `Étape ${order + 1}`,
        order,
        ...(elements && {
          elements: {
            create: (elements as Array<{ type: string; messageText?: string; noteText?: string; waitDescription?: string; price?: number }>).map((el, i) => ({
              type: el.type,
              order: i,
              messageText: el.messageText || null,
              noteText: el.noteText || null,
              waitDescription: el.waitDescription || null,
              price: el.price || null,
            })),
          },
        }),
      },
      include: {
        elements: { orderBy: { order: "asc" }, include: { medias: true } },
      },
    });

    return jsonSuccess(step, 201);
  } catch (err: unknown) {
    console.error("[STEPS POST]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

// PUT /api/scripts/[id]/steps/reorder
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const { stepIds } = await req.json();
    if (!Array.isArray(stepIds)) return jsonError("stepIds requis");

    for (let i = 0; i < stepIds.length; i++) {
      await prisma.scriptStep.updateMany({
        where: { id: stepIds[i], scriptId: params.id },
        data: { order: i },
      });
    }

    return jsonSuccess({ reordered: stepIds.length });
  } catch (err: unknown) {
    console.error("[STEPS REORDER]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
