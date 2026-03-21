import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const body = await req.json();
    const updated = await prisma.scriptMedia.update({
      where: { id: params.mediaId },
      data: {
        ...(body.mediaType !== undefined && { mediaType: body.mediaType }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.outfit !== undefined && { outfit: body.outfit }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.driveLink !== undefined && { driveLink: body.driveLink }),
      },
    });
    return jsonSuccess(updated);
  } catch (err: unknown) {
    console.error("[MEDIA PATCH]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    await prisma.scriptMedia.delete({ where: { id: params.mediaId } });
    return jsonSuccess({ deleted: true });
  } catch (err: unknown) {
    console.error("[MEDIA DELETE]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
