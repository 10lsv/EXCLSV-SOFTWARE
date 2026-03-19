import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, CustomStatus, ContentType, Prisma } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { createCustomSchema } from "@/lib/validations/custom";

// GET /api/customs — list filtered by role
export async function GET(req: NextRequest) {
  const { error, session } = await requireRole(
    Role.OWNER,
    Role.ADMIN,
    Role.CHATTER_MANAGER,
    Role.CHATTER,
    Role.MODEL
  );
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") as CustomStatus | null;
  const modelId = searchParams.get("modelId") || "";
  const contentType = searchParams.get("contentType") as ContentType | null;
  const clientCategory = searchParams.get("clientCategory") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const role = session!.user.role as Role;
  const userId = session!.user.id;

  // Build where clause with role-based filtering
  const conditions: Prisma.CustomContentWhereInput[] = [];

  // Role-based data isolation
  if (role === Role.CHATTER) {
    const chatterProfile = await prisma.chatterProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!chatterProfile) return jsonError("Profil chatter introuvable", 404);

    const assignments = await prisma.chatterAssignment.findMany({
      where: { chatterId: chatterProfile.id, isActive: true },
      select: { modelId: true },
    });
    const assignedModelIds = assignments.map((a) => a.modelId);
    conditions.push({ modelId: { in: assignedModelIds } });
  } else if (role === Role.MODEL) {
    const modelProfile = await prisma.modelProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!modelProfile) return jsonError("Profil modèle introuvable", 404);
    conditions.push({ modelId: modelProfile.id });
  }

  // Filters
  if (status) conditions.push({ status });
  if (modelId) conditions.push({ modelId });
  if (contentType) conditions.push({ contentType: { has: contentType } });
  if (clientCategory) conditions.push({ clientCategory });
  if (search) {
    conditions.push({
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { model: { stageName: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.CustomContentWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};

  const [customs, total] = await Promise.all([
    prisma.customContent.findMany({
      where,
      include: {
        model: { select: { id: true, stageName: true, photoUrl: true } },
        createdBy: {
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.customContent.count({ where }),
  ]);

  return jsonSuccess({ customs, total, page, limit });
}

// POST /api/customs — create custom content
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(
    Role.OWNER,
    Role.ADMIN,
    Role.CHATTER
  );
  if (error) return error;

  const body = await req.json();
  const parsed = createCustomSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message);
  }

  const data = parsed.data;
  const role = session!.user.role as Role;

  // If CHATTER, enforce createdById is their own profile
  if (role === Role.CHATTER) {
    const chatterProfile = await prisma.chatterProfile.findUnique({
      where: { userId: session!.user.id },
      select: { id: true, driveLink: true },
    });
    if (!chatterProfile) return jsonError("Profil chatter introuvable", 404);
    data.createdById = chatterProfile.id;

    // Auto-fill driveLink from chatter profile if not provided
    if (!data.driveLink && chatterProfile.driveLink) {
      data.driveLink = chatterProfile.driveLink;
    }

    // Verify chatter is assigned to this model
    const assignment = await prisma.chatterAssignment.findFirst({
      where: {
        chatterId: chatterProfile.id,
        modelId: data.modelId,
        isActive: true,
      },
    });
    if (!assignment) {
      return jsonError("Vous n'êtes pas assigné à ce modèle", 403);
    }
  }

  // Verify createdById is a valid ChatterProfile
  const chatter = await prisma.chatterProfile.findUnique({
    where: { id: data.createdById },
    select: { id: true, driveLink: true },
  });
  if (!chatter) return jsonError("Chatter introuvable", 404);

  // Auto-fill driveLink from chatter profile if not provided (for OWNER/ADMIN)
  if (!data.driveLink && chatter.driveLink) {
    data.driveLink = chatter.driveLink;
  }

  // Verify modelId exists
  const model = await prisma.modelProfile.findUnique({
    where: { id: data.modelId },
  });
  if (!model) return jsonError("Modèle introuvable", 404);

  const custom = await prisma.customContent.create({
    data: {
      modelId: data.modelId,
      createdById: data.createdById,
      description: data.description,
      contentType: data.contentType,
      duration: data.duration || null,
      outfit: data.outfit || null,
      clientCategory: data.clientCategory,
      clientHandle: data.clientHandle || null,
      totalPrice: data.totalPrice,
      amountCollected: data.amountCollected,
      notes: data.notes || null,
      driveLink: data.driveLink || null,
    },
    include: {
      model: { select: { id: true, stageName: true, photoUrl: true } },
      createdBy: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  await logAudit(
    session!.user.id,
    "CREATE_CUSTOM",
    "CustomContent",
    custom.id,
    { modelId: data.modelId, totalPrice: data.totalPrice }
  );

  return jsonSuccess(custom, 201);
}
