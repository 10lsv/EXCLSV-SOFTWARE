import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// GET /api/scripts/my/[id] — script detail for model
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const mp = await prisma.modelProfile.findUnique({
    where: { userId: session!.user.id },
    select: { id: true },
  });
  if (!mp) return jsonError("Profil modèle introuvable", 404);

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      contentTasks: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!script || script.modelId !== mp.id) return jsonError("Script introuvable", 404);

  return jsonSuccess(script);
}
