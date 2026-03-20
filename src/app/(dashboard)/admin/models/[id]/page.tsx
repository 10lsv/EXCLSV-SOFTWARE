"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModelForm } from "@/components/models/model-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Pencil, Trash2, ExternalLink, Loader2, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { CreateModelInput } from "@/lib/validations/model";

interface ModelDetail {
  id: string;
  userId: string;
  stageName: string;
  dateOfBirth: string | null;
  location: string | null;
  timezone: string | null;
  occupation: string | null;
  languages: string[];
  photoUrl: string | null;
  height: string | null;
  hairColor: string | null;
  eyeColor: string | null;
  tattoos: string | null;
  piercings: string | null;
  style: string | null;
  distinctFeatures: string | null;
  personalityTraits: string | null;
  acceptedContent: string[];
  boundaries: string | null;
  sexualizationLevel: string | null;
  personalityNotes: string | null;
  onlyfansUrl: string | null;
  instagramUrl: string | null;
  instagramHandle: string | null;
  tiktokUrl: string | null;
  tiktokHandle: string | null;
  twitterUrl: string | null;
  twitterHandle: string | null;
  redditUrl: string | null;
  redditHandle: string | null;
  threadsUrl: string | null;
  threadsHandle: string | null;
  contractSignedAt: string | null;
  contractFileUrl: string | null;
  agencyPercentage: number;
  billingFrequency: string;
  createdAt: string;
  user: { id: string; email: string; name: string };
  chatterAssignments: Array<{
    id: string;
    chatter: {
      id: string;
      user: { id: string; name: string; email: string };
    };
  }>;
  _count: { customs: number; invoices: number; scripts: number };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

function SocialLink({
  platform,
  url,
  handle,
}: {
  platform: string;
  url: string | null;
  handle: string | null;
}) {
  if (!url && !handle) return null;
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{platform}</p>
        <p className="text-sm text-muted-foreground">{handle || "—"}</p>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      )}
    </div>
  );
}

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(searchParams.get("edit") === "true");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allChatters, setAllChatters] = useState<Array<{ id: string; user: { name: string; email: string } }>>([]);
  const [selectedChatterId, setSelectedChatterId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchModel = useCallback(async () => {
    const res = await fetch(`/api/models/${params.id}`);
    const json = await res.json();
    if (json.success) {
      setModel(json.data);
    }
    setLoading(false);
  }, [params.id]);

  const fetchChatters = useCallback(async () => {
    const res = await fetch("/api/chatters");
    const json = await res.json();
    if (json.success) setAllChatters(json.data);
  }, []);

  useEffect(() => {
    fetchModel();
    fetchChatters();
  }, [fetchModel, fetchChatters]);

  async function handleAssign() {
    if (!selectedChatterId) return;
    setAssigning(true);
    const res = await fetch(`/api/models/${params.id}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatterId: selectedChatterId }),
    });
    if (res.ok) {
      setSelectedChatterId("");
      fetchModel();
    }
    setAssigning(false);
  }

  async function handleUnassign(chatterId: string) {
    if (!confirm("Retirer ce chatter de cette modèle ?")) return;
    await fetch(`/api/models/${params.id}/assignments/${chatterId}`, {
      method: "DELETE",
    });
    fetchModel();
  }

  async function handleUpdate(data: CreateModelInput) {
    setSaving(true);
    const res = await fetch(`/api/models/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      setEditOpen(false);
      fetchModel();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette modèle ? Cette action est irréversible.")) {
      return;
    }
    setDeleting(true);
    await fetch(`/api/models/${params.id}`, { method: "DELETE" });
    router.push("/admin/models");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Modèle introuvable.
      </div>
    );
  }

  const editDefaults: Partial<CreateModelInput> = {
    stageName: model.stageName,
    name: model.user.name,
    dateOfBirth: model.dateOfBirth
      ? model.dateOfBirth.split("T")[0]
      : null,
    location: model.location,
    timezone: model.timezone,
    occupation: model.occupation,
    languages: model.languages,
    photoUrl: model.photoUrl,
    height: model.height,
    hairColor: model.hairColor,
    eyeColor: model.eyeColor,
    tattoos: model.tattoos,
    piercings: model.piercings,
    style: model.style,
    distinctFeatures: model.distinctFeatures,
    personalityTraits: model.personalityTraits,
    acceptedContent: model.acceptedContent,
    boundaries: model.boundaries,
    sexualizationLevel: model.sexualizationLevel,
    personalityNotes: model.personalityNotes,
    onlyfansUrl: model.onlyfansUrl,
    instagramUrl: model.instagramUrl,
    instagramHandle: model.instagramHandle,
    tiktokUrl: model.tiktokUrl,
    tiktokHandle: model.tiktokHandle,
    twitterUrl: model.twitterUrl,
    twitterHandle: model.twitterHandle,
    redditUrl: model.redditUrl,
    redditHandle: model.redditHandle,
    threadsUrl: model.threadsUrl,
    threadsHandle: model.threadsHandle,
    contractSignedAt: model.contractSignedAt
      ? model.contractSignedAt.split("T")[0]
      : null,
    contractFileUrl: model.contractFileUrl,
    agencyPercentage: model.agencyPercentage,
    billingFrequency: model.billingFrequency,
  };

  const billingLabels: Record<string, string> = {
    bimonthly: "Bimensuel (1er et 15)",
    monthly: "Mensuel",
    weekly: "Hebdomadaire",
  };

  const sexLabels: Record<string, string> = {
    soft: "Soft",
    medium: "Medium",
    explicit: "Explicit",
    hardcore: "Hardcore",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarImage src={model.photoUrl || undefined} />
            <AvatarFallback className="text-lg">
              {model.stageName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {model.stageName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {model.location && <span>{model.location}</span>}
              {model.location && <span>&middot;</span>}
              <span>{model.user.email}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{model._count.customs}</p>
            <p className="text-xs text-muted-foreground">Customs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{model._count.scripts}</p>
            <p className="text-xs text-muted-foreground">Scripts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{model._count.invoices}</p>
            <p className="text-xs text-muted-foreground">Factures</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="identity">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="identity">Identité</TabsTrigger>
          <TabsTrigger value="physical">Physique</TabsTrigger>
          <TabsTrigger value="personality">Personnalité</TabsTrigger>
          <TabsTrigger value="social">Réseaux</TabsTrigger>
          <TabsTrigger value="contract">Contrat</TabsTrigger>
          <TabsTrigger value="chatters">Chatters</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Card>
            <CardContent className="grid gap-x-8 gap-y-1 p-6 md:grid-cols-2">
              <InfoRow label="Nom complet" value={model.user.name} />
              <InfoRow label="Nom de scène" value={model.stageName} />
              <InfoRow
                label="Date de naissance"
                value={
                  model.dateOfBirth
                    ? format(new Date(model.dateOfBirth), "d MMMM yyyy", {
                        locale: fr,
                      })
                    : null
                }
              />
              <InfoRow label="Localisation" value={model.location} />
              <InfoRow label="Fuseau horaire" value={model.timezone} />
              <InfoRow label="Occupation" value={model.occupation} />
              <InfoRow
                label="Langues"
                value={
                  model.languages.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {model.languages.map((l) => (
                        <Badge key={l} variant="secondary">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  ) : null
                }
              />
              <InfoRow label="Traits distinctifs" value={model.distinctFeatures} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physical">
          <Card>
            <CardContent className="grid gap-x-8 gap-y-1 p-6 md:grid-cols-2">
              <InfoRow label="Taille" value={model.height} />
              <InfoRow label="Cheveux" value={model.hairColor} />
              <InfoRow label="Yeux" value={model.eyeColor} />
              <InfoRow label="Tatouages" value={model.tattoos} />
              <InfoRow label="Piercings" value={model.piercings} />
              <InfoRow label="Style" value={model.style} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personality">
          <Card>
            <CardContent className="space-y-4 p-6">
              <InfoRow
                label="Traits de personnalité"
                value={model.personalityTraits}
              />
              <Separator />
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">
                  Contenu accepté
                </span>
                <div className="flex flex-wrap gap-1">
                  {model.acceptedContent.length > 0
                    ? model.acceptedContent.map((c) => (
                        <Badge key={c} variant="secondary">
                          {c}
                        </Badge>
                      ))
                    : <span className="text-sm font-medium">—</span>}
                </div>
              </div>
              <Separator />
              <InfoRow label="Limites strictes" value={model.boundaries} />
              <InfoRow
                label="Niveau de sexualisation"
                value={
                  model.sexualizationLevel
                    ? sexLabels[model.sexualizationLevel] ||
                      model.sexualizationLevel
                    : null
                }
              />
              <InfoRow
                label="Notes supplémentaires"
                value={model.personalityNotes}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardContent className="grid gap-3 p-6 md:grid-cols-2">
              <SocialLink
                platform="OnlyFans"
                url={model.onlyfansUrl}
                handle={model.onlyfansUrl ? "Voir le profil" : null}
              />
              <SocialLink
                platform="Instagram"
                url={model.instagramUrl}
                handle={model.instagramHandle}
              />
              <SocialLink
                platform="TikTok"
                url={model.tiktokUrl}
                handle={model.tiktokHandle}
              />
              <SocialLink
                platform="Twitter/X"
                url={model.twitterUrl}
                handle={model.twitterHandle}
              />
              <SocialLink
                platform="Reddit"
                url={model.redditUrl}
                handle={model.redditHandle}
              />
              <SocialLink
                platform="Threads"
                url={model.threadsUrl}
                handle={model.threadsHandle}
              />
              {!model.onlyfansUrl &&
                !model.instagramUrl &&
                !model.tiktokUrl &&
                !model.twitterUrl &&
                !model.redditUrl &&
                !model.threadsUrl && (
                  <p className="col-span-2 text-center text-sm text-muted-foreground py-4">
                    Aucun compte social renseigné.
                  </p>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract">
          <Card>
            <CardContent className="grid gap-x-8 gap-y-1 p-6 md:grid-cols-2">
              <InfoRow
                label="Date de signature"
                value={
                  model.contractSignedAt
                    ? format(
                        new Date(model.contractSignedAt),
                        "d MMMM yyyy",
                        { locale: fr }
                      )
                    : null
                }
              />
              <InfoRow
                label="Fichier contrat"
                value={
                  model.contractFileUrl ? (
                    <a
                      href={model.contractFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Voir le contrat
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null
                }
              />
              <InfoRow
                label="Pourcentage agence"
                value={`${model.agencyPercentage}%`}
              />
              <InfoRow
                label="Fréquence de facturation"
                value={
                  billingLabels[model.billingFrequency] ||
                  model.billingFrequency
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chatters">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chatters assignés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assign new chatter */}
              <div className="flex gap-2">
                <Select value={selectedChatterId} onValueChange={setSelectedChatterId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner un chatter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allChatters
                      .filter((c) => !model.chatterAssignments.some((a) => a.chatter.id === c.id))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.user.name} ({c.user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssign} disabled={!selectedChatterId || assigning} size="sm">
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Assigner
                </Button>
              </div>

              {/* Current assignments */}
              {model.chatterAssignments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun chatter assigné à cette modèle.
                </p>
              ) : (
                <div className="space-y-2">
                  {model.chatterAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {assignment.chatter.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.chatter.user.email}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleUnassign(assignment.chatter.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier — {model.stageName}</DialogTitle>
          </DialogHeader>
          <ModelForm
            defaultValues={editDefaults}
            onSubmit={handleUpdate}
            isEdit
            loading={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
