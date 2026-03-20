"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
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
  agencyPercentage: number;
  billingFrequency: string;
  contractSignedAt: string | null;
  contractFileUrl: string | null;
  user: { id: string; email: string; name: string };
}

type SectionKey = "identity" | "physical" | "personality" | "social";

function InfoRow({ label, value, locked }: { label: string; value: React.ReactNode; locked?: boolean }) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {label}
        {locked && (
          <span title="Modifiable uniquement par l'agence">
            <Lock className="h-3 w-3 text-muted-foreground/60" />
          </span>
        )}
      </span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function ModelProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editSection, setEditSection] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/models/me");
    const json = await res.json();
    if (json.success) setProfile(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function openEdit(section: SectionKey) {
    if (!profile) return;
    const fields = sectionFields[section];
    const initial: Record<string, string> = {};
    for (const f of fields) {
      const val = (profile as Record<string, unknown>)[f.key];
      if (Array.isArray(val)) {
        initial[f.key] = val.join(", ");
      } else if (val === null || val === undefined) {
        initial[f.key] = "";
      } else {
        initial[f.key] = String(val);
      }
    }
    setForm(initial);
    setEditSection(section);
  }

  async function handleSave() {
    if (!editSection) return;
    setSaving(true);

    const fields = sectionFields[editSection];
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const val = form[f.key] ?? "";
      if (f.type === "array") {
        body[f.key] = val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        body[f.key] = val || null;
      }
    }

    const res = await fetch("/api/models/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({ title: "Profil mis à jour" });
      setEditSection(null);
      fetchProfile();
    } else {
      toast({ title: "Erreur", description: "Impossible de mettre à jour", variant: "destructive" });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Profil introuvable.
      </div>
    );
  }

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
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.photoUrl || undefined} />
          <AvatarFallback className="text-lg">
            {profile.stageName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{profile.stageName}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.location || profile.user.email}
          </p>
        </div>
      </div>

      {/* Identité */}
      <SectionCard title="Identité" onEdit={() => openEdit("identity")}>
        <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
          <InfoRow label="Nom complet" value={profile.user.name} />
          <InfoRow label="Nom de scène" value={profile.stageName} />
          <InfoRow
            label="Date de naissance"
            value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("fr-FR") : null}
          />
          <InfoRow label="Localisation" value={profile.location} />
          <InfoRow label="Fuseau horaire" value={profile.timezone} />
          <InfoRow label="Occupation" value={profile.occupation} />
          <InfoRow
            label="Langues"
            value={
              profile.languages.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {profile.languages.map((l) => (
                    <Badge key={l} variant="secondary">{l}</Badge>
                  ))}
                </div>
              ) : null
            }
          />
        </div>
      </SectionCard>

      {/* Physique */}
      <SectionCard title="Profil physique" onEdit={() => openEdit("physical")}>
        <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
          <InfoRow label="Taille" value={profile.height} />
          <InfoRow label="Cheveux" value={profile.hairColor} />
          <InfoRow label="Yeux" value={profile.eyeColor} />
          <InfoRow label="Tatouages" value={profile.tattoos} />
          <InfoRow label="Piercings" value={profile.piercings} />
          <InfoRow label="Style" value={profile.style} />
          <InfoRow label="Traits distinctifs" value={profile.distinctFeatures} />
        </div>
      </SectionCard>

      {/* Personnalité */}
      <SectionCard title="Personnalité & Boundaries" onEdit={() => openEdit("personality")}>
        <InfoRow label="Traits de personnalité" value={profile.personalityTraits} />
        <InfoRow
          label="Contenu accepté"
          value={
            profile.acceptedContent.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {profile.acceptedContent.map((c) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
              </div>
            ) : null
          }
        />
        <InfoRow label="Limites strictes" value={profile.boundaries} />
        <InfoRow
          label="Niveau de sexualisation"
          value={profile.sexualizationLevel ? sexLabels[profile.sexualizationLevel] || profile.sexualizationLevel : null}
        />
        <InfoRow label="Notes" value={profile.personalityNotes} />
      </SectionCard>

      {/* Réseaux sociaux */}
      <SectionCard title="Réseaux sociaux" onEdit={() => openEdit("social")}>
        <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
          <InfoRow label="OnlyFans" value={profile.onlyfansUrl} />
          <InfoRow label="Instagram" value={profile.instagramHandle || profile.instagramUrl} />
          <InfoRow label="TikTok" value={profile.tiktokHandle || profile.tiktokUrl} />
          <InfoRow label="Twitter/X" value={profile.twitterHandle || profile.twitterUrl} />
          <InfoRow label="Reddit" value={profile.redditHandle || profile.redditUrl} />
          <InfoRow label="Threads" value={profile.threadsHandle || profile.threadsUrl} />
        </div>
      </SectionCard>

      {/* Contrat (lecture seule) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Contrat
            <Lock className="h-4 w-4 text-muted-foreground/60" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
            <InfoRow label="Pourcentage agence" value={`${profile.agencyPercentage}%`} locked />
            <InfoRow label="Fréquence de facturation" value={billingLabels[profile.billingFrequency] || profile.billingFrequency} locked />
            <InfoRow
              label="Date de signature"
              value={profile.contractSignedAt ? new Date(profile.contractSignedAt).toLocaleDateString("fr-FR") : null}
              locked
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editSection} onOpenChange={(v) => !v && setEditSection(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier — {editSection && sectionTitles[editSection]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editSection &&
              sectionFields[editSection].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <Input
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Modifier
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "array";
  placeholder?: string;
}

const sectionTitles: Record<SectionKey, string> = {
  identity: "Identité",
  physical: "Profil physique",
  personality: "Personnalité & Boundaries",
  social: "Réseaux sociaux",
};

const sectionFields: Record<SectionKey, FieldDef[]> = {
  identity: [
    { key: "stageName", label: "Nom de scène" },
    { key: "dateOfBirth", label: "Date de naissance", placeholder: "YYYY-MM-DD" },
    { key: "location", label: "Localisation" },
    { key: "timezone", label: "Fuseau horaire", placeholder: "Europe/Paris" },
    { key: "occupation", label: "Occupation" },
    { key: "languages", label: "Langues (séparées par des virgules)", type: "array", placeholder: "Français, Anglais" },
  ],
  physical: [
    { key: "height", label: "Taille", placeholder: "170cm" },
    { key: "hairColor", label: "Couleur des cheveux" },
    { key: "eyeColor", label: "Couleur des yeux" },
    { key: "tattoos", label: "Tatouages", type: "textarea" },
    { key: "piercings", label: "Piercings" },
    { key: "style", label: "Style vestimentaire" },
    { key: "distinctFeatures", label: "Traits distinctifs", type: "textarea" },
  ],
  personality: [
    { key: "personalityTraits", label: "Traits de personnalité", type: "textarea" },
    { key: "acceptedContent", label: "Contenu accepté (séparé par des virgules)", type: "array", placeholder: "Photos, Vidéos, Audio" },
    { key: "boundaries", label: "Limites strictes", type: "textarea" },
    { key: "sexualizationLevel", label: "Niveau de sexualisation", placeholder: "soft / medium / explicit / hardcore" },
    { key: "personalityNotes", label: "Notes supplémentaires", type: "textarea" },
  ],
  social: [
    { key: "onlyfansUrl", label: "OnlyFans URL" },
    { key: "instagramHandle", label: "Instagram @" },
    { key: "instagramUrl", label: "Instagram URL" },
    { key: "tiktokHandle", label: "TikTok @" },
    { key: "tiktokUrl", label: "TikTok URL" },
    { key: "twitterHandle", label: "Twitter/X @" },
    { key: "twitterUrl", label: "Twitter/X URL" },
    { key: "redditHandle", label: "Reddit @" },
    { key: "redditUrl", label: "Reddit URL" },
    { key: "threadsHandle", label: "Threads @" },
    { key: "threadsUrl", label: "Threads URL" },
  ],
};
