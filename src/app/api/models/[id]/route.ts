import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { updateModelSchema } from "@/lib/validations/model";

// GET /api/models/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const model = await prisma.modelProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      chatterAssignments: {
        where: { isActive: true },
        include: {
          chatter: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      _count: {
        select: {
          customs: true,
          invoices: true,
          scripts: true,
        },
      },
    },
  });

  if (!model) {
    return jsonError("Modèle introuvable", 404);
  }

  return jsonSuccess(model);
}

// PATCH /api/models/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const body = await req.json();
  const parsed = updateModelSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0].message);
  }

  const existing = await prisma.modelProfile.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return jsonError("Modèle introuvable", 404);
  }

  const data = parsed.data;

  const updated = await prisma.modelProfile.update({
    where: { id: params.id },
    data: {
      ...(data.stageName !== undefined && { stageName: data.stageName }),
      ...(data.dateOfBirth !== undefined && {
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      }),
      ...(data.location !== undefined && { location: data.location || null }),
      ...(data.timezone !== undefined && { timezone: data.timezone || null }),
      ...(data.occupation !== undefined && {
        occupation: data.occupation || null,
      }),
      ...(data.languages !== undefined && { languages: data.languages }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl || null }),
      ...(data.height !== undefined && { height: data.height || null }),
      ...(data.hairColor !== undefined && { hairColor: data.hairColor || null }),
      ...(data.eyeColor !== undefined && { eyeColor: data.eyeColor || null }),
      ...(data.tattoos !== undefined && { tattoos: data.tattoos || null }),
      ...(data.piercings !== undefined && { piercings: data.piercings || null }),
      ...(data.style !== undefined && { style: data.style || null }),
      ...(data.distinctFeatures !== undefined && {
        distinctFeatures: data.distinctFeatures || null,
      }),
      ...(data.personalityTraits !== undefined && {
        personalityTraits: data.personalityTraits || null,
      }),
      ...(data.acceptedContent !== undefined && {
        acceptedContent: data.acceptedContent,
      }),
      ...(data.boundaries !== undefined && {
        boundaries: data.boundaries || null,
      }),
      ...(data.sexualizationLevel !== undefined && {
        sexualizationLevel: data.sexualizationLevel || null,
      }),
      ...(data.personalityNotes !== undefined && {
        personalityNotes: data.personalityNotes || null,
      }),
      ...(data.onlyfansUrl !== undefined && {
        onlyfansUrl: data.onlyfansUrl || null,
      }),
      ...(data.instagramUrl !== undefined && {
        instagramUrl: data.instagramUrl || null,
      }),
      ...(data.instagramHandle !== undefined && {
        instagramHandle: data.instagramHandle || null,
      }),
      ...(data.tiktokUrl !== undefined && {
        tiktokUrl: data.tiktokUrl || null,
      }),
      ...(data.tiktokHandle !== undefined && {
        tiktokHandle: data.tiktokHandle || null,
      }),
      ...(data.twitterUrl !== undefined && {
        twitterUrl: data.twitterUrl || null,
      }),
      ...(data.twitterHandle !== undefined && {
        twitterHandle: data.twitterHandle || null,
      }),
      ...(data.redditUrl !== undefined && {
        redditUrl: data.redditUrl || null,
      }),
      ...(data.redditHandle !== undefined && {
        redditHandle: data.redditHandle || null,
      }),
      ...(data.threadsUrl !== undefined && {
        threadsUrl: data.threadsUrl || null,
      }),
      ...(data.threadsHandle !== undefined && {
        threadsHandle: data.threadsHandle || null,
      }),
      ...(data.contractSignedAt !== undefined && {
        contractSignedAt: data.contractSignedAt
          ? new Date(data.contractSignedAt)
          : null,
      }),
      ...(data.contractFileUrl !== undefined && {
        contractFileUrl: data.contractFileUrl || null,
      }),
      ...(data.agencyPercentage !== undefined && {
        agencyPercentage: data.agencyPercentage,
      }),
      ...(data.billingFrequency !== undefined && {
        billingFrequency: data.billingFrequency,
      }),
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  // Update user name if provided
  if (data.name) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { name: data.name },
    });
  }

  await logAudit(
    session!.user.id,
    "UPDATE_MODEL",
    "ModelProfile",
    params.id,
    { fields: Object.keys(data) }
  );

  return jsonSuccess(updated);
}

// DELETE /api/models/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const model = await prisma.modelProfile.findUnique({
    where: { id: params.id },
    select: { userId: true, stageName: true },
  });

  if (!model) {
    return jsonError("Modèle introuvable", 404);
  }

  // Delete assignments first, then profile, then user
  await prisma.$transaction([
    prisma.chatterAssignment.deleteMany({
      where: { modelId: params.id },
    }),
    prisma.modelProfile.delete({ where: { id: params.id } }),
    prisma.user.delete({ where: { id: model.userId } }),
  ]);

  await logAudit(
    session!.user.id,
    "DELETE_MODEL",
    "ModelProfile",
    params.id,
    { stageName: model.stageName }
  );

  return jsonSuccess({ deleted: true });
}
