import { z } from "zod";

export const createCustomSchema = z.object({
  modelId: z.string().min(1, "Modèle requis"),
  createdById: z.string().min(1, "Chatter requis"),
  description: z.string().min(1, "Description requise"),
  contentType: z
    .array(z.enum(["PHOTO", "VIDEO", "AUDIO", "COMBO"]))
    .min(1, "Au moins un type de contenu requis"),
  duration: z.string().optional().nullable(),
  outfit: z.string().optional().nullable(),
  clientCategory: z.enum(["whale", "spender", "regular", "new"], {
    message: "Catégorie client requise",
  }),
  clientHandle: z.string().optional().nullable(),
  totalPrice: z.number().min(0, "Le prix doit être positif"),
  amountCollected: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  driveLink: z.string().optional().nullable(),
});

export const updateCustomSchema = z.object({
  description: z.string().min(1, "Description requise").optional(),
  contentType: z
    .array(z.enum(["PHOTO", "VIDEO", "AUDIO", "COMBO"]))
    .min(1, "Au moins un type de contenu requis")
    .optional(),
  duration: z.string().optional().nullable(),
  outfit: z.string().optional().nullable(),
  clientCategory: z
    .enum(["whale", "spender", "regular", "new"])
    .optional(),
  clientHandle: z.string().optional().nullable(),
  totalPrice: z.number().min(0, "Le prix doit être positif").optional(),
  amountCollected: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  driveLink: z.string().optional().nullable(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1, "Message requis"),
});

export type CreateCustomInput = z.infer<typeof createCustomSchema>;
export type UpdateCustomInput = z.infer<typeof updateCustomSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
