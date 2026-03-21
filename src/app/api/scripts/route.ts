import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// GET /api/scripts — list with filters
export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN, Role.CHATTER_MANAGER);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const modelId = searchParams.get("modelId");
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const where: Prisma.ScriptWhereInput = {};
  if (modelId) where.modelId = modelId;
  if (status) where.status = status as "DRAFT" | "VALIDATED";
  if (category) where.category = category;

  const scripts = await prisma.script.findMany({
    where,
    include: {
      model: { select: { id: true, stageName: true, photoUrl: true } },
      _count: { select: { steps: true, contentTasks: true } },
      contentTasks: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = scripts.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
    targetPrice: s.targetPrice,
    status: s.status,
    tags: s.tags,
    model: s.model,
    _count: s._count,
    completedContentTasks: s.contentTasks.filter((t) => t.status === "COMPLETED").length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  return jsonSuccess(data);
}

// POST /api/scripts — create
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const body = await req.json();
  const { name, modelId, category, description, targetPrice, targetAudience, tags } = body;

  if (!name || !modelId || !category) {
    return jsonError("name, modelId et category requis");
  }

  const script = await prisma.script.create({
    data: {
      name,
      modelId,
      category,
      description: description || null,
      targetPrice: targetPrice ? parseFloat(targetPrice) : null,
      targetAudience: targetAudience || null,
      tags: tags || [],
    },
  });

  await logAudit(session!.user.id, "CREATE_SCRIPT", "Script", script.id, { name, modelId, category });

  return jsonSuccess(script, 201);
}
