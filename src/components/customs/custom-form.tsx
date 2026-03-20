"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCustomSchema, type CreateCustomInput } from "@/lib/validations/custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { ChatterOption, ModelOption } from "@/types/custom.types";

interface CustomFormProps {
  defaultValues?: Partial<CreateCustomInput>;
  onSubmit: (data: CreateCustomInput) => Promise<void>;
  models: ModelOption[];
  chatters?: ChatterOption[];
  showChatterSelect?: boolean;
  loading?: boolean;
  isEdit?: boolean;
}

const contentTypes = [
  { value: "PHOTO", label: "Photo" },
  { value: "VIDEO", label: "Vidéo" },
  { value: "AUDIO", label: "Audio" },
  { value: "COMBO", label: "Combo" },
] as const;

const clientCategories = [
  { value: "whale", label: "Whale" },
  { value: "spender", label: "Spender" },
  { value: "regular", label: "Regular" },
  { value: "new", label: "New" },
] as const;

export function CustomForm({
  defaultValues,
  onSubmit,
  models,
  chatters = [],
  showChatterSelect = false,
  loading,
  isEdit,
}: CustomFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCustomInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createCustomSchema) as any,
    defaultValues: {
      contentType: [],
      ...defaultValues,
    },
  });

  const selectedTypes = watch("contentType") || [];

  function toggleContentType(type: string) {
    const current = selectedTypes as string[];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setValue("contentType", next as CreateCustomInput["contentType"], {
      shouldValidate: true,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Model */}
      <div className="space-y-2">
        <Label>Modèle *</Label>
        <Select
          value={watch("modelId") || ""}
          onValueChange={(v) => setValue("modelId", v, { shouldValidate: true })}
          disabled={isEdit}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un modèle" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.stageName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.modelId && (
          <p className="text-sm text-destructive">{errors.modelId.message}</p>
        )}
      </div>

      {/* Chatter (admin only) */}
      {showChatterSelect && (
        <div className="space-y-2">
          <Label>Chatter créateur *</Label>
          <Select
            value={watch("createdById") || ""}
            onValueChange={(v) => {
              setValue("createdById", v, { shouldValidate: true });
              // Auto-fill driveLink from selected chatter
              const selected = chatters.find((c) => c.id === v);
              if (selected?.driveLink) {
                setValue("driveLink", selected.driveLink);
              }
            }}
            disabled={isEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un chatter" />
            </SelectTrigger>
            <SelectContent>
              {chatters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.createdById && (
            <p className="text-sm text-destructive">
              {errors.createdById.message}
            </p>
          )}
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea
          {...register("description")}
          placeholder="Description détaillée du custom..."
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Content Types */}
      <div className="space-y-2">
        <Label>Type de contenu *</Label>
        <div className="flex flex-wrap gap-4">
          {contentTypes.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedTypes.includes(type.value)}
                onCheckedChange={() => toggleContentType(type.value)}
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
        </div>
        {errors.contentType && (
          <p className="text-sm text-destructive">
            {errors.contentType.message}
          </p>
        )}
      </div>

      {/* Duration & Outfit */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Durée (si vidéo/audio)</Label>
          <Input {...register("duration")} placeholder="Ex: 5min" />
        </div>
        <div className="space-y-2">
          <Label>Tenue</Label>
          <Input {...register("outfit")} placeholder="Ex: Lingerie rouge" />
        </div>
      </div>

      {/* Client Handle */}
      <div className="space-y-2">
        <Label>@ du client</Label>
        <Input {...register("clientHandle")} placeholder="Ex: @username" />
      </div>

      {/* Client Category */}
      <div className="space-y-2">
        <Label>Catégorie client *</Label>
        <Select
          value={watch("clientCategory") || ""}
          onValueChange={(v) =>
            setValue("clientCategory", v as CreateCustomInput["clientCategory"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {clientCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.clientCategory && (
          <p className="text-sm text-destructive">
            {errors.clientCategory.message}
          </p>
        )}
      </div>

      {/* Pricing */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Prix total ($) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register("totalPrice", {
              setValueAs: (v: string) => (v === "" ? 0 : parseFloat(v)),
            })}
            placeholder="0"
          />
          {errors.totalPrice && (
            <p className="text-sm text-destructive">
              {errors.totalPrice.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Montant collecté ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register("amountCollected", {
              setValueAs: (v: string) => (v === "" ? 0 : parseFloat(v)),
            })}
            placeholder="0"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          {...register("notes")}
          placeholder="Notes supplémentaires..."
          rows={2}
        />
      </div>

      {/* Drive Link */}
      <div className="space-y-2">
        <Label>Lien Google Drive</Label>
        <Input {...register("driveLink")} placeholder="https://drive.google.com/..." />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? "Enregistrer" : "Créer le custom"}
      </Button>
    </form>
  );
}
