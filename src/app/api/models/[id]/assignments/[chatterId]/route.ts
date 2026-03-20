import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// DELETE /api/models/[id]/assignments/[chatterId] — remove chatter from model
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; chatterId: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const assignment = await prisma.chatterAssignment.findUnique({
    where: {
      chatterId_modelId: { chatterId: params.chatterId, modelId: params.id },
    },
    include: {
      chatter: { select: { user: { select: { name: true } } } },
      model: { select: { stageName: true } },
    },
  });

  if (!assignment) return jsonError("Assignation introuvable", 404);

  await prisma.chatterAssignment.delete({
    where: { id: assignment.id },
  });

  await logAudit(
    session!.user.id,
    "UNASSIGN_CHATTER",
    "ChatterAssignment",
    assignment.id,
    {
      chatterName: assignment.chatter.user.name,
      modelName: assignment.model.stageName,
    }
  );

  return jsonSuccess({ deleted: true });
}
