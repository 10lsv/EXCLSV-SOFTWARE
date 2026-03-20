import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// GET /api/content/templates?modelId=xxx
export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const modelId = req.nextUrl.searchParams.get("modelId");
  if (!modelId) return jsonError("modelId requis");

  const templates = await prisma.weeklyContentTemplate.findMany({
    where: { modelId },
    orderBy: [{ platform: "asc" }, { sortOrder: "asc" }],
  });

  return jsonSuccess(templates);
}

// POST /api/content/templates
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const body = await req.json();
  const { modelId, category, platform, quantity, driveLink } = body;

  if (!modelId || !category || !platform || !quantity) {
    return jsonError("Champs requis : modelId, category, platform, quantity");
  }

  const existing = await prisma.weeklyContentTemplate.findUnique({
    where: { modelId_category_platform: { modelId, category, platform } },
  });
  if (existing) return jsonError("Ce template existe déjà pour cette modèle");

  const maxSort = await prisma.weeklyContentTemplate.findFirst({
    where: { modelId, platform },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const template = await prisma.weeklyContentTemplate.create({
    data: {
      modelId,
      category,
      platform,
      quantity: parseInt(quantity),
      driveLink: driveLink || null,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    },
  });

  await logAudit(session!.user.id, "CREATE_TEMPLATE", "WeeklyContentTemplate", template.id, { modelId, category, platform });

  return jsonSuccess(template, 201);
}
