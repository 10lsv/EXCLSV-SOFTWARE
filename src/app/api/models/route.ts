import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { createModelSchema } from "@/lib/validations/model";

// GET /api/models — list with search + pagination
export async function GET(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { stageName: { contains: search, mode: "insensitive" as const } },
          { user: { name: { contains: search, mode: "insensitive" as const } } },
          { location: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [models, total] = await Promise.all([
    prisma.modelProfile.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { chatterAssignments: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.modelProfile.count({ where }),
  ]);

  return jsonSuccess({ models, total, page, limit });
}

// POST /api/models — create model + user
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  const body = await req.json();
  const parsed = createModelSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0].message);
  }

  const { email, name, password, ...profileData } = parsed.data;

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("Un utilisateur avec cet email existe déjà");
  }

  const hashedPassword = await bcrypt.hash(password || "model123", 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: Role.MODEL,
      modelProfile: {
        create: {
          stageName: profileData.stageName,
          dateOfBirth: profileData.dateOfBirth
            ? new Date(profileData.dateOfBirth)
            : null,
          location: profileData.location || null,
          timezone: profileData.timezone || null,
          occupation: profileData.occupation || null,
          languages: profileData.languages,
          photoUrl: profileData.photoUrl || null,
          height: profileData.height || null,
          hairColor: profileData.hairColor || null,
          eyeColor: profileData.eyeColor || null,
          tattoos: profileData.tattoos || null,
          piercings: profileData.piercings || null,
          style: profileData.style || null,
          distinctFeatures: profileData.distinctFeatures || null,
          personalityTraits: profileData.personalityTraits || null,
          acceptedContent: profileData.acceptedContent,
          boundaries: profileData.boundaries || null,
          sexualizationLevel: profileData.sexualizationLevel || null,
          personalityNotes: profileData.personalityNotes || null,
          onlyfansUrl: profileData.onlyfansUrl || null,
          instagramUrl: profileData.instagramUrl || null,
          instagramHandle: profileData.instagramHandle || null,
          tiktokUrl: profileData.tiktokUrl || null,
          tiktokHandle: profileData.tiktokHandle || null,
          twitterUrl: profileData.twitterUrl || null,
          twitterHandle: profileData.twitterHandle || null,
          redditUrl: profileData.redditUrl || null,
          redditHandle: profileData.redditHandle || null,
          threadsUrl: profileData.threadsUrl || null,
          threadsHandle: profileData.threadsHandle || null,
          contractSignedAt: profileData.contractSignedAt
            ? new Date(profileData.contractSignedAt)
            : null,
          contractFileUrl: profileData.contractFileUrl || null,
          agencyPercentage: profileData.agencyPercentage,
          billingFrequency: profileData.billingFrequency,
        },
      },
    },
    include: {
      modelProfile: true,
    },
  });

  await logAudit(
    session!.user.id,
    "CREATE_MODEL",
    "ModelProfile",
    user.modelProfile!.id,
    { email, stageName: profileData.stageName }
  );

  return jsonSuccess(user, 201);
}
