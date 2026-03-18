import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export function jsonSuccess(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) {
    return { error: jsonError("Non authentifié", 401), session: null };
  }
  if (!roles.includes(session.user.role as Role)) {
    return { error: jsonError("Accès interdit", 403), session: null };
  }
  return { error: null, session };
}

export async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, details },
  });
}
