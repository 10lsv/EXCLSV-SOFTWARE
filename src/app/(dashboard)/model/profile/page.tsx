"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pencil,
  Lock,
  Loader2,
  Camera,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2Mo

function InfoRow({ label, value, locked, fullWidth }: {
  label: string;
  value: React.ReactNode;
  locked?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1 py-2.5", fullWidth && "md:col-span-2")}>
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {locked && (
          <span title="Modifiable uniquement par l'agence">
            <Lock className="h-3 w-3" />
          </span>
        )}
      </span>
      <span className="text-sm font-semibold text-foreground">{value || "—"}</span>
    </div>
  );
}

function SocialBadge({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Badge variant="outline" className="gap-1 hover:bg-muted transition-colors cursor-pointer">
        {label}
        <ExternalLink className="h-3 w-3" />
      </Badge>
    </a>
  );
}

export default function ModelProfilePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editSection, setEditSection] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/models/me");
    const json = await res.json();
    if (json.success) {
      setProfile(json.data);
      setPhotoPreview(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Photo upload
  function handlePhotoClick() {
    fileInputRef.current?.click();
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_SIZE) {
      toast({ title: "Image trop lourde", description: "Maximum 2Mo", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setUploadingPhoto(true);

      const res = await fetch("/api/models/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: base64 }),
      });

      if (res.ok) {
        toast({ title: "Photo mise à jour" });
        fetchProfile();
      } else {
        toast({ title: "Erreur", description: "Impossible de sauvegarder la photo", variant: "destructive" });
        setPhotoPreview(null);
      }
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  }

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
        body[f.key] = val.split(",").map((s) => s.trim()).filter(Boolean);
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
    return <div className="py-20 text-center text-muted-foreground">Profil introuvable.</div>;
  }

  const displayPhoto = photoPreview || profile.photoUrl || undefined;
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* ─── Header ─── */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="flex flex-col items-center gap-4 p-0 md:flex-row md:items-start md:gap-6">
          {/* Photo */}
          <button
            onClick={handlePhotoClick}
            disabled={uploadingPhoto}
            className="group relative shrink-0"
          >
            <Avatar className="h-28 w-28 ring-2 ring-border">
              <AvatarImage src={displayPhoto} />
              <AvatarFallback className="text-2xl font-bold bg-muted">
                {profile.stageName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {uploadingPhoto ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </div>
          </button>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold tracking-tight">{profile.stageName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile.location || profile.user.email}
            </p>
            {/* Social badges */}
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center md:justify-start">
              <SocialBadge url={profile.onlyfansUrl} label="OnlyFans" />
              <SocialBadge url={profile.instagramUrl} label="Instagram" />
              <SocialBadge url={profile.tiktokUrl} label="TikTok" />
              <SocialBadge url={profile.twitterUrl} label="Twitter" />
              <SocialBadge url={profile.redditUrl} label="Reddit" />
              <SocialBadge url={profile.threadsUrl} label="Threads" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ─── Identité ─── */}
      <SectionCard title="Identité" accent="bg-foreground" onEdit={() => openEdit("identity")}>
        <div className="grid gap-x-8 md:grid-cols-2">
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
            fullWidth
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

      {/* ─── Physique ─── */}
      <SectionCard title="Profil physique" accent="bg-muted-foreground/40" onEdit={() => openEdit("physical")}>
        <div className="grid gap-x-8 md:grid-cols-2">
          <InfoRow label="Taille" value={profile.height} />
          <InfoRow label="Cheveux" value={profile.hairColor} />
          <InfoRow label="Yeux" value={profile.eyeColor} />
          <InfoRow label="Tatouages" value={profile.tattoos} />
          <InfoRow label="Piercings" value={profile.piercings} />
          <InfoRow label="Style" value={profile.style} />
          <InfoRow label="Traits distinctifs" value={profile.distinctFeatures} fullWidth />
        </div>
      </SectionCard>

      {/* ─── Personnalité & Boundaries ─── */}
      <SectionCard title="Personnalité & Boundaries" accent="bg-[#E91E8C]" onEdit={() => openEdit("personality")}>
        <InfoRow label="Traits de personnalité" value={profile.personalityTraits} fullWidth />

        {/* Contenu accepté — badges verts */}
        <div className="py-2.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Contenu accepté</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {profile.acceptedContent.length > 0
              ? profile.acceptedContent.map((c) => (
                  <Badge key={c} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                    {c}
                  </Badge>
                ))
              : <span className="text-sm font-semibold">—</span>}
          </div>
        </div>

        {/* Boundaries — fond rosé */}
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 p-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-red-600 dark:text-red-400 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Limites strictes
          </span>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300 mt-1">
            {profile.boundaries || "—"}
          </p>
        </div>

        <div className="grid gap-x-8 md:grid-cols-2 mt-2">
          <InfoRow
            label="Niveau de sexualisation"
            value={profile.sexualizationLevel ? sexLabels[profile.sexualizationLevel] || profile.sexualizationLevel : null}
          />
        </div>
        <InfoRow label="Notes" value={profile.personalityNotes} fullWidth />
      </SectionCard>

      {/* ─── Réseaux sociaux ─── */}
      <SectionCard title="Réseaux sociaux" accent="bg-blue-500" onEdit={() => openEdit("social")}>
        <div className="grid gap-x-8 md:grid-cols-2">
          <SocialRow label="OnlyFans" handle={profile.onlyfansUrl ? "Lien" : null} url={profile.onlyfansUrl} />
          <SocialRow label="Instagram" handle={profile.instagramHandle} url={profile.instagramUrl} />
          <SocialRow label="TikTok" handle={profile.tiktokHandle} url={profile.tiktokUrl} />
          <SocialRow label="Twitter/X" handle={profile.twitterHandle} url={profile.twitterUrl} />
          <SocialRow label="Reddit" handle={profile.redditHandle} url={profile.redditUrl} />
          <SocialRow label="Threads" handle={profile.threadsHandle} url={profile.threadsUrl} />
        </div>
      </SectionCard>

      {/* ─── Contrat (lecture seule) ─── */}
      <Card className="bg-muted/30 border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
            <Lock className="h-4 w-4" />
            Contrat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 md:grid-cols-2">
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

      {/* ─── Edit Dialog ─── */}
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
                  <Label className="text-xs uppercase tracking-wide">{f.label}</Label>
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

// ─── Sub-components ───

function SectionCard({
  title,
  accent,
  onEdit,
  children,
}: {
  title: string;
  accent: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-5 w-1 rounded-full", accent)} />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEdit}>
          <Pencil className="mr-1 h-3 w-3" />
          Modifier
        </Button>
      </CardHeader>
      <CardContent className="pl-8">{children}</CardContent>
    </Card>
  );
}

function SocialRow({ label, handle, url }: { label: string; handle: string | null; url: string | null }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <p className="text-sm font-semibold">{handle || url || "—"}</p>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      )}
    </div>
  );
}

// ─── Field definitions ───

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
