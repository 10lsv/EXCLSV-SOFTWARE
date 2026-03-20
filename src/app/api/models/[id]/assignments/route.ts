import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// POST /api/models/[id]/assignments — assign chatter to model
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const { chatterId } = await req.json();
  if (!chatterId) return jsonError("chatterId requis", 400);

  const model = await prisma.modelProfile.findUnique({
    where: { id: params.id },
    select: { id: true, stageName: true },
  });
  if (!model) return jsonError("Modèle introuvable", 404);

  const chatter = await prisma.chatterProfile.findUnique({
    where: { id: chatterId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!chatter) return jsonError("Chatter introuvable", 404);

  const assignment = await prisma.chatterAssignment.upsert({
    where: {
      chatterId_modelId: { chatterId, modelId: params.id },
    },
    update: { isActive: true },
    create: { chatterId, modelId: params.id },
  });

  await logAudit(
    session!.user.id,
    "ASSIGN_CHATTER",
    "ChatterAssignment",
    assignment.id,
    { chatterName: chatter.user.name, modelName: model.stageName }
  );

  return jsonSuccess(assignment, 201);
}
