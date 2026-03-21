import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// PATCH /api/scripts/[id]/content/[contentId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; contentId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const task = await prisma.scriptContentTask.findUnique({ where: { id: params.contentId } });
  if (!task || task.scriptId !== params.id) return jsonError("Contenu introuvable", 404);

  const body = await req.json();

  const updated = await prisma.scriptContentTask.update({
    where: { id: params.contentId },
    data: {
      ...(body.description !== undefined && { description: body.description }),
      ...(body.contentType !== undefined && { contentType: body.contentType }),
      ...(body.outfit !== undefined && { outfit: body.outfit }),
      ...(body.duration !== undefined && { duration: body.duration }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.driveLink !== undefined && { driveLink: body.driveLink }),
    },
  });

  return jsonSuccess(updated);
}

// DELETE /api/scripts/[id]/content/[contentId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; contentId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const task = await prisma.scriptContentTask.findUnique({ where: { id: params.contentId } });
  if (!task || task.scriptId !== params.id) return jsonError("Contenu introuvable", 404);

  await prisma.scriptContentTask.delete({ where: { id: params.contentId } });

  return jsonSuccess({ deleted: true });
}
