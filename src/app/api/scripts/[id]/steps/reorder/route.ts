import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// PATCH /api/scripts/[id]/steps/reorder
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const body = await req.json();
  const { orderedIds } = body;

  if (!Array.isArray(orderedIds)) return jsonError("orderedIds requis");

  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.scriptStep.updateMany({
      where: { id: orderedIds[i], scriptId: params.id },
      data: { sortOrder: i },
    });
  }

  return jsonSuccess({ reordered: orderedIds.length });
}
