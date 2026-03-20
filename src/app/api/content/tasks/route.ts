import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole } from "@/lib/api-utils";

// GET /api/content/tasks?modelId=xxx&weekStart=2026-03-16
export async function GET(req: NextRequest) {
  const { error } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const modelId = req.nextUrl.searchParams.get("modelId");
  const weekStartStr = req.nextUrl.searchParams.get("weekStart");

  if (!modelId || !weekStartStr) {
    return jsonError("modelId et weekStart requis");
  }

  const parsed = new Date(weekStartStr);
  const weekStart = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));

  const tasks = await prisma.weeklyContentTask.findMany({
    where: { modelId, weekStart },
    orderBy: [{ platform: "asc" }, { category: "asc" }],
  });

  return jsonSuccess(tasks);
}
