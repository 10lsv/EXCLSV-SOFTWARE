import { z } from "zod";

export const createModelSchema = z.object({
  // User fields
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Nom requis"),
  password: z.string().min(6, "Minimum 6 caractères").optional(),

  // Identity
  stageName: z.string().min(1, "Nom de scène requis"),
  dateOfBirth: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  languages: z.array(z.string()).default([]),
  photoUrl: z.string().optional().nullable(),

  // Physical
  height: z.string().optional().nullable(),
  hairColor: z.string().optional().nullable(),
  eyeColor: z.string().optional().nullable(),
  tattoos: z.string().optional().nullable(),
  piercings: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  distinctFeatures: z.string().optional().nullable(),

  // Personality & boundaries
  personalityTraits: z.string().optional().nullable(),
  acceptedContent: z.array(z.string()).default([]),
  boundaries: z.string().optional().nullable(),
  sexualizationLevel: z.string().optional().nullable(),
  personalityNotes: z.string().optional().nullable(),

  // Social accounts
  onlyfansUrl: z.string().optional().nullable(),
  instagramUrl: z.string().optional().nullable(),
  instagramHandle: z.string().optional().nullable(),
  tiktokUrl: z.string().optional().nullable(),
  tiktokHandle: z.string().optional().nullable(),
  twitterUrl: z.string().optional().nullable(),
  twitterHandle: z.string().optional().nullable(),
  redditUrl: z.string().optional().nullable(),
  redditHandle: z.string().optional().nullable(),
  threadsUrl: z.string().optional().nullable(),
  threadsHandle: z.string().optional().nullable(),

  // Contract
  contractSignedAt: z.string().optional().nullable(),
  contractFileUrl: z.string().optional().nullable(),
  agencyPercentage: z.number().min(0).max(100).default(50),
  billingFrequency: z.string().default("bimonthly"),
});

export const updateModelSchema = createModelSchema.partial().omit({
  email: true,
  password: true,
});

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
