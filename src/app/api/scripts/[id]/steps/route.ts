import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// POST /api/scripts/[id]/steps — add a step
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const script = await prisma.script.findUnique({ where: { id: params.id } });
  if (!script) return jsonError("Script introuvable", 404);

  const body = await req.json();
  const { title, content, notes, type, price, waitDuration } = body;

  if (!content) return jsonError("content requis");

  // Get next sortOrder
  const lastStep = await prisma.scriptStep.findFirst({
    where: { scriptId: params.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const step = await prisma.scriptStep.create({
    data: {
      scriptId: params.id,
      sortOrder: (lastStep?.sortOrder ?? -1) + 1,
      title: title || "",
      content,
      notes: notes || null,
      type: type || "message",
      price: price ? parseFloat(price) : null,
      waitDuration: waitDuration || null,
    },
  });

  return jsonSuccess(step, 201);
}
