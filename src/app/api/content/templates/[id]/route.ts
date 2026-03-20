import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// PATCH /api/content/templates/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const template = await prisma.weeklyContentTemplate.findUnique({
    where: { id: params.id },
  });
  if (!template) return jsonError("Template introuvable", 404);

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.quantity !== undefined) data.quantity = parseInt(body.quantity);
  if (body.driveLink !== undefined) data.driveLink = body.driveLink || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.category !== undefined) data.category = body.category;

  const updated = await prisma.weeklyContentTemplate.update({
    where: { id: params.id },
    data,
  });

  await logAudit(session!.user.id, "UPDATE_TEMPLATE", "WeeklyContentTemplate", params.id, data);

  return jsonSuccess(updated);
}

// DELETE /api/content/templates/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const template = await prisma.weeklyContentTemplate.findUnique({
    where: { id: params.id },
  });
  if (!template) return jsonError("Template introuvable", 404);

  await prisma.weeklyContentTemplate.delete({ where: { id: params.id } });

  await logAudit(session!.user.id, "DELETE_TEMPLATE", "WeeklyContentTemplate", params.id);

  return jsonSuccess({ deleted: true });
}
