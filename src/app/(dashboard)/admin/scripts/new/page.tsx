"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";

interface ModelOption {
  id: string;
  stageName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  UPSELL: "Upsell",
  SEXTING: "Sexting",
  RETENTION: "Rétention",
  FIRST_MESSAGE: "Premier message",
  MASS_DM: "Mass DM",
  CUSTOM_PROMO: "Promo custom",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function AdminScriptsNewPage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [driveFolder, setDriveFolder] = useState("");
  const [tags, setTags] = useState("");

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models?limit=100");
      const json = await res.json();
      if (json.success) {
        setModels(
          json.data.models.map((m: ModelOption) => ({
            id: m.id,
            stageName: m.stageName,
          }))
        );
      }
    } catch (err) {
      console.error("[Scripts] Erreur chargement modèles:", err);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }
    if (!modelId) {
      setError("Veuillez sélectionner un modèle");
      return;
    }
    if (!category) {
      setError("Veuillez sélectionner une catégorie");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          modelId,
          category,
          description: description.trim() || undefined,
          driveFolder: driveFolder.trim() || undefined,
          tags: parsedTags.length > 0 ? parsedTags : undefined,
        }),
      });

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error("[Scripts] Réponse non-JSON:", res.status, text.substring(0, 200));
        setError(`Erreur serveur (${res.status})`);
        setLoading(false);
        return;
      }

      if (!json.success) {
        setError(json.error || "Erreur lors de la création");
        setLoading(false);
        return;
      }

      router.push(`/admin/scripts/${json.data.id}`);
    } catch (err) {
      console.error("[Scripts] Erreur réseau:", err);
      setError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => router.push("/admin/scripts")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux scripts
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nouveau script</h1>
        <p className="text-sm text-muted-foreground">
          Créez un nouveau script de vente
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nom du script <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ex: Scène douche — Spender"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Modèle <span className="text-destructive">*</span>
              </label>
              <Select value={modelId} onValueChange={setModelId}>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Catégorie <span className="text-destructive">*</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Décrivez le script, le contexte, les objectifs..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dossier Google Drive</label>
              <Input
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveFolder}
                onChange={(e) => setDriveFolder(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lien vers le dossier partagé pour déposer les contenus
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <Input
                placeholder="Ex: douche, spender, upsell (séparés par des virgules)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Séparez les tags par des virgules
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/scripts")}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le script
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
