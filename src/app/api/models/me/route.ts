import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";

// Fields the model is NOT allowed to change
const ADMIN_ONLY_FIELDS = [
  "agencyPercentage",
  "billingFrequency",
  "contractSignedAt",
  "contractFileUrl",
];

// GET /api/models/me — get own profile
export async function GET() {
  const { error, session } = await requireRole(Role.MODEL, Role.OWNER, Role.ADMIN);
  if (error) return error;

  const profile = await prisma.modelProfile.findUnique({
    where: { userId: session!.user.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!profile) return jsonError("Profil introuvable", 404);

  return jsonSuccess(profile);
}

// PATCH /api/models/me — update own profile (model only)
export async function PATCH(req: NextRequest) {
  const { error, session } = await requireRole(Role.MODEL);
  if (error) return error;

  const profile = await prisma.modelProfile.findUnique({
    where: { userId: session!.user.id },
    select: { id: true },
  });

  if (!profile) return jsonError("Profil introuvable", 404);

  const body = await req.json();

  // Strip admin-only fields
  for (const field of ADMIN_ONLY_FIELDS) {
    delete body[field];
  }

  const updated = await prisma.modelProfile.update({
    where: { id: profile.id },
    data: {
      ...(body.stageName !== undefined && { stageName: body.stageName }),
      ...(body.dateOfBirth !== undefined && {
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      }),
      ...(body.location !== undefined && { location: body.location || null }),
      ...(body.timezone !== undefined && { timezone: body.timezone || null }),
      ...(body.occupation !== undefined && { occupation: body.occupation || null }),
      ...(body.languages !== undefined && { languages: body.languages }),
      ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl || null }),
      ...(body.height !== undefined && { height: body.height || null }),
      ...(body.hairColor !== undefined && { hairColor: body.hairColor || null }),
      ...(body.eyeColor !== undefined && { eyeColor: body.eyeColor || null }),
      ...(body.tattoos !== undefined && { tattoos: body.tattoos || null }),
      ...(body.piercings !== undefined && { piercings: body.piercings || null }),
      ...(body.style !== undefined && { style: body.style || null }),
      ...(body.distinctFeatures !== undefined && { distinctFeatures: body.distinctFeatures || null }),
      ...(body.personalityTraits !== undefined && { personalityTraits: body.personalityTraits || null }),
      ...(body.acceptedContent !== undefined && { acceptedContent: body.acceptedContent }),
      ...(body.boundaries !== undefined && { boundaries: body.boundaries || null }),
      ...(body.sexualizationLevel !== undefined && { sexualizationLevel: body.sexualizationLevel || null }),
      ...(body.personalityNotes !== undefined && { personalityNotes: body.personalityNotes || null }),
      ...(body.onlyfansUrl !== undefined && { onlyfansUrl: body.onlyfansUrl || null }),
      ...(body.instagramUrl !== undefined && { instagramUrl: body.instagramUrl || null }),
      ...(body.instagramHandle !== undefined && { instagramHandle: body.instagramHandle || null }),
      ...(body.tiktokUrl !== undefined && { tiktokUrl: body.tiktokUrl || null }),
      ...(body.tiktokHandle !== undefined && { tiktokHandle: body.tiktokHandle || null }),
      ...(body.twitterUrl !== undefined && { twitterUrl: body.twitterUrl || null }),
      ...(body.twitterHandle !== undefined && { twitterHandle: body.twitterHandle || null }),
      ...(body.redditUrl !== undefined && { redditUrl: body.redditUrl || null }),
      ...(body.redditHandle !== undefined && { redditHandle: body.redditHandle || null }),
      ...(body.threadsUrl !== undefined && { threadsUrl: body.threadsUrl || null }),
      ...(body.threadsHandle !== undefined && { threadsHandle: body.threadsHandle || null }),
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  await logAudit(
    session!.user.id,
    "UPDATE_OWN_PROFILE",
    "ModelProfile",
    profile.id,
    { fields: Object.keys(body) }
  );

  return jsonSuccess(updated);
}
