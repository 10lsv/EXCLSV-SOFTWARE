import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/api-utils";

// GET — fetch current model profile for onboarding
export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonError("Non authentifié", 401);

  const profile = await prisma.modelProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!profile) return jsonError("Profil introuvable", 404);

  return jsonSuccess(profile);
}

// PATCH — save onboarding step data
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return jsonError("Non authentifié", 401);

  const profile = await prisma.modelProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) return jsonError("Profil introuvable", 404);

  const body = await req.json();
  const { step, data } = body;

  if (!step) {
    return jsonError("Step requis");
  }

  switch (step) {
    case "identity": {
      // Update user name
      if (data.name) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { name: data.name },
        });
      }
      await prisma.modelProfile.update({
        where: { id: profile.id },
        data: {
          stageName: data.stageName || profile.stageName,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : profile.dateOfBirth,
          location: data.location ?? profile.location,
          timezone: data.timezone ?? profile.timezone,
          occupation: data.occupation ?? profile.occupation,
          languages: data.languages ?? profile.languages,
          photoUrl: data.photoUrl ?? profile.photoUrl,
        },
      });
      break;
    }
    case "physical": {
      await prisma.modelProfile.update({
        where: { id: profile.id },
        data: {
          height: data.height ?? profile.height,
          hairColor: data.hairColor ?? profile.hairColor,
          eyeColor: data.eyeColor ?? profile.eyeColor,
          tattoos: data.tattoos ?? profile.tattoos,
          piercings: data.piercings ?? profile.piercings,
          style: data.style ?? profile.style,
          distinctFeatures: data.distinctFeatures ?? profile.distinctFeatures,
        },
      });
      break;
    }
    case "personality": {
      await prisma.modelProfile.update({
        where: { id: profile.id },
        data: {
          personalityTraits: data.personalityTraits ?? profile.personalityTraits,
          acceptedContent: data.acceptedContent ?? profile.acceptedContent,
          boundaries: data.boundaries ?? profile.boundaries,
          sexualizationLevel: data.sexualizationLevel ?? profile.sexualizationLevel,
          personalityNotes: data.personalityNotes ?? profile.personalityNotes,
        },
      });
      break;
    }
    case "socials": {
      await prisma.modelProfile.update({
        where: { id: profile.id },
        data: {
          onlyfansUrl: data.onlyfansUrl ?? profile.onlyfansUrl,
          instagramUrl: data.instagramUrl ?? profile.instagramUrl,
          instagramHandle: data.instagramHandle ?? profile.instagramHandle,
          tiktokUrl: data.tiktokUrl ?? profile.tiktokUrl,
          tiktokHandle: data.tiktokHandle ?? profile.tiktokHandle,
          twitterUrl: data.twitterUrl ?? profile.twitterUrl,
          twitterHandle: data.twitterHandle ?? profile.twitterHandle,
          redditUrl: data.redditUrl ?? profile.redditUrl,
          redditHandle: data.redditHandle ?? profile.redditHandle,
          threadsUrl: data.threadsUrl ?? profile.threadsUrl,
          threadsHandle: data.threadsHandle ?? profile.threadsHandle,
          otherSocials: data.otherSocials ?? profile.otherSocials,
        },
      });
      break;
    }
    case "complete": {
      console.log("[onboarding] Completing onboarding for profile:", profile.id);
      await prisma.modelProfile.update({
        where: { id: profile.id },
        data: { onboardingCompleted: true },
      });
      console.log("[onboarding] onboardingCompleted set to true");
      break;
    }
    default:
      return jsonError("Étape invalide");
  }

  return jsonSuccess({ saved: true });
}
