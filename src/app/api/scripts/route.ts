import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

const scriptInclude = {
  model: { select: { id: true, stageName: true, photoUrl: true } },
  steps: {
    orderBy: { order: "asc" as const },
    include: {
      elements: {
        orderBy: { order: "asc" as const },
        include: { medias: { orderBy: { order: "asc" as const } } },
      },
    },
  },
};

export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN, Role.CHATTER_MANAGER);
  if (error) return error;

  try {
    const { searchParams } = req.nextUrl;
    const modelId = searchParams.get("modelId");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: Prisma.ScriptWhereInput = {};
    if (modelId) where.modelId = modelId;
    if (status) where.status = status;
    if (category) where.category = category;

    const scripts = await prisma.script.findMany({
      where,
      include: scriptInclude,
      orderBy: { createdAt: "desc" },
    });

    const data = scripts.map((s) => {
      const allMedias = s.steps.flatMap((st) =>
        st.elements.flatMap((el) => el.medias)
      );
      const totalPrice = s.steps
        .flatMap((st) => st.elements)
        .filter((el) => el.type === "PAID_CONTENT" && el.price)
        .reduce((sum, el) => sum + (el.price || 0), 0);

      return {
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        status: s.status,
        tags: s.tags,
        model: s.model,
        stepsCount: s.steps.length,
        totalMedias: allMedias.length,
        completedMedias: allMedias.filter((m) => m.status === "COMPLETED").length,
        totalPrice,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return jsonSuccess(data);
  } catch (err: unknown) {
    console.error("[SCRIPTS GET]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, modelId, category, description, driveFolder, tags } = body;

    if (!name || !modelId || !category) {
      return jsonError("name, modelId et category requis");
    }

    const script = await prisma.script.create({
      data: {
        name,
        modelId,
        category,
        description: description || null,
        driveFolder: driveFolder || null,
        tags: tags || [],
      },
    });

    await logAudit(session!.user.id, "CREATE_SCRIPT", "Script", script.id, { name, modelId, category });
    return jsonSuccess(script, 201);
  } catch (err: unknown) {
    console.error("[SCRIPTS POST]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
