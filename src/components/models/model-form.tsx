"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createModelSchema, type CreateModelInput } from "@/lib/validations/model";
import { Loader2 } from "lucide-react";

const CONTENT_CATEGORIES = [
  "Lingerie",
  "Nue artistique",
  "Nue explicite",
  "Fétiche pieds",
  "Cosplay",
  "JOI",
  "Sexting",
  "Vidéo personnalisée",
  "Audio/Vocal",
  "Duo/Collaboration",
  "Contenu extérieur",
  "BDSM light",
  "GFE",
];

const SEXUALIZATION_LEVELS = [
  { value: "soft", label: "Soft — Lingerie, suggestif" },
  { value: "medium", label: "Medium — Nue artistique, tease" },
  { value: "explicit", label: "Explicit — Contenu explicite" },
  { value: "hardcore", label: "Hardcore — Tout type de contenu" },
];

interface ModelFormProps {
  defaultValues?: Partial<CreateModelInput>;
  onSubmit: (data: CreateModelInput) => Promise<void>;
  isEdit?: boolean;
  loading?: boolean;
}

export function ModelForm({
  defaultValues,
  onSubmit,
  isEdit = false,
  loading = false,
}: ModelFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateModelInput>({
    resolver: zodResolver(createModelSchema) as any,
    defaultValues: {
      languages: [],
      acceptedContent: [],
      agencyPercentage: 50,
      billingFrequency: "bimonthly",
      ...defaultValues,
    },
  });

  const acceptedContent = watch("acceptedContent") || [];
  const languages = watch("languages") || [];

  function toggleContent(category: string) {
    const current = acceptedContent;
    if (current.includes(category)) {
      setValue(
        "acceptedContent",
        current.filter((c) => c !== category)
      );
    } else {
      setValue("acceptedContent", [...current, category]);
    }
  }

  function handleLanguageChange(value: string) {
    const langs = value
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    setValue("languages", langs);
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="identity">Identité</TabsTrigger>
          <TabsTrigger value="physical">Physique</TabsTrigger>
          <TabsTrigger value="personality">Personnalité</TabsTrigger>
          <TabsTrigger value="social">Réseaux</TabsTrigger>
          <TabsTrigger value="contract">Contrat</TabsTrigger>
          {!isEdit && <TabsTrigger value="account">Compte</TabsTrigger>}
        </TabsList>

        {/* Identity */}
        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stageName">
                    Nom de scène <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stageName"
                    {...register("stageName")}
                    placeholder="Ex: Luna"
                  />
                  {errors.stageName && (
                    <p className="text-sm text-destructive">
                      {errors.stageName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photoUrl">URL de la photo</Label>
                  <Input
                    id="photoUrl"
                    {...register("photoUrl")}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date de naissance</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register("dateOfBirth")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input
                    id="location"
                    {...register("location")}
                    placeholder="Ex: Paris, France"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Input
                    id="timezone"
                    {...register("timezone")}
                    placeholder="Ex: Europe/Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    {...register("occupation")}
                    placeholder="Ex: Étudiante, Mannequin..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="languages">
                  Langues (séparées par des virgules)
                </Label>
                <Input
                  id="languages"
                  value={languages.join(", ")}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  placeholder="Français, Anglais, Espagnol"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Physical */}
        <TabsContent value="physical">
          <Card>
            <CardHeader>
              <CardTitle>Profil physique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="height">Taille</Label>
                  <Input
                    id="height"
                    {...register("height")}
                    placeholder="Ex: 170cm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hairColor">Couleur de cheveux</Label>
                  <Input
                    id="hairColor"
                    {...register("hairColor")}
                    placeholder="Ex: Blonde"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eyeColor">Couleur des yeux</Label>
                  <Input
                    id="eyeColor"
                    {...register("eyeColor")}
                    placeholder="Ex: Bleus"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tattoos">Tatouages</Label>
                  <Textarea
                    id="tattoos"
                    {...register("tattoos")}
                    placeholder="Description des tatouages..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="piercings">Piercings</Label>
                  <Textarea
                    id="piercings"
                    {...register("piercings")}
                    placeholder="Description des piercings..."
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="style">Style vestimentaire</Label>
                  <Input
                    id="style"
                    {...register("style")}
                    placeholder="Ex: Casual chic, Streetwear..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distinctFeatures">Traits distinctifs</Label>
                  <Input
                    id="distinctFeatures"
                    {...register("distinctFeatures")}
                    placeholder="Ex: Grain de beauté, fossettes..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personality */}
        <TabsContent value="personality">
          <Card>
            <CardHeader>
              <CardTitle>Personnalité & Boundaries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="personalityTraits">
                  Traits de personnalité
                </Label>
                <Textarea
                  id="personalityTraits"
                  {...register("personalityTraits")}
                  placeholder="Ex: Enjouée, taquine, douce..."
                />
              </div>
              <div className="space-y-2">
                <Label>Contenu accepté</Label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {CONTENT_CATEGORIES.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`content-${category}`}
                        checked={acceptedContent.includes(category)}
                        onCheckedChange={() => toggleContent(category)}
                      />
                      <label
                        htmlFor={`content-${category}`}
                        className="text-sm cursor-pointer"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="boundaries">Limites strictes</Label>
                <Textarea
                  id="boundaries"
                  {...register("boundaries")}
                  placeholder="Ce que la modèle refuse catégoriquement..."
                />
              </div>
              <div className="space-y-2">
                <Label>Niveau de sexualisation</Label>
                <Select
                  defaultValue={defaultValues?.sexualizationLevel || ""}
                  onValueChange={(v) => setValue("sexualizationLevel", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEXUALIZATION_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personalityNotes">Notes supplémentaires</Label>
                <Textarea
                  id="personalityNotes"
                  {...register("personalityNotes")}
                  placeholder="Informations complémentaires pour les chatters..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Comptes sociaux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onlyfansUrl">OnlyFans URL</Label>
                <Input
                  id="onlyfansUrl"
                  {...register("onlyfansUrl")}
                  placeholder="https://onlyfans.com/..."
                />
              </div>
              {[
                {
                  platform: "Instagram",
                  urlField: "instagramUrl" as const,
                  handleField: "instagramHandle" as const,
                },
                {
                  platform: "TikTok",
                  urlField: "tiktokUrl" as const,
                  handleField: "tiktokHandle" as const,
                },
                {
                  platform: "Twitter/X",
                  urlField: "twitterUrl" as const,
                  handleField: "twitterHandle" as const,
                },
                {
                  platform: "Reddit",
                  urlField: "redditUrl" as const,
                  handleField: "redditHandle" as const,
                },
                {
                  platform: "Threads",
                  urlField: "threadsUrl" as const,
                  handleField: "threadsHandle" as const,
                },
              ].map(({ platform, urlField, handleField }) => (
                <div key={platform} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={urlField}>{platform} URL</Label>
                    <Input
                      id={urlField}
                      {...register(urlField)}
                      placeholder={`https://${platform.toLowerCase()}.com/...`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={handleField}>{platform} Handle</Label>
                    <Input
                      id={handleField}
                      {...register(handleField)}
                      placeholder="@username"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contract */}
        <TabsContent value="contract">
          <Card>
            <CardHeader>
              <CardTitle>Contrat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contractSignedAt">Date de signature</Label>
                  <Input
                    id="contractSignedAt"
                    type="date"
                    {...register("contractSignedAt")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractFileUrl">Lien du contrat (PDF)</Label>
                  <Input
                    id="contractFileUrl"
                    {...register("contractFileUrl")}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agencyPercentage">
                    Pourcentage agence (%)
                  </Label>
                  <Input
                    id="agencyPercentage"
                    type="number"
                    min={0}
                    max={100}
                    {...register("agencyPercentage", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fréquence de facturation</Label>
                  <Select
                    defaultValue={
                      defaultValues?.billingFrequency || "bimonthly"
                    }
                    onValueChange={(v) => setValue("billingFrequency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bimonthly">
                        Bimensuel (1er et 15)
                      </SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account (create only) */}
        {!isEdit && (
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Compte utilisateur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nom complet <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Prénom Nom"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="modele@email.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Mot de passe (défaut : model123)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="Laisser vide pour le mot de passe par défaut"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Enregistrer les modifications" : "Créer la modèle"}
        </Button>
      </div>
    </form>
  );
}
