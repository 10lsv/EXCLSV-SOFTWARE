import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// POST /api/scripts/[id]/content — add a content task
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    select: { id: true, modelId: true },
  });
  if (!script) return jsonError("Script introuvable", 404);

  const body = await req.json();
  const { description, contentType, outfit, duration } = body;

  if (!description || !contentType) return jsonError("description et contentType requis");

  const task = await prisma.scriptContentTask.create({
    data: {
      scriptId: params.id,
      modelId: script.modelId,
      description,
      contentType,
      outfit: outfit || null,
      duration: duration || null,
    },
  });

  return jsonSuccess(task, 201);
}
