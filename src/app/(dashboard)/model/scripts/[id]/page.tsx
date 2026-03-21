"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Camera,
  Video,
  Mic,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ——— Constants ———

const CATEGORY_COLORS: Record<string, string> = {
  UPSELL: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  SEXTING: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  RETENTION: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  FIRST_MESSAGE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  MASS_DM: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  CUSTOM_PROMO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
};

const CATEGORY_LABELS: Record<string, string> = {
  UPSELL: "Upsell",
  SEXTING: "Sexting",
  RETENTION: "Rétention",
  FIRST_MESSAGE: "Premier message",
  MASS_DM: "Mass DM",
  CUSTOM_PROMO: "Promo custom",
};

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  MESSAGE: "Message",
  FREE_CONTENT: "Contenu gratuit",
  PAID_CONTENT: "PPV",
  WAIT: "Attente",
  NOTE: "Note",
};

const MEDIA_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  IN_PROGRESS: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const MEDIA_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
};

const MEDIA_TYPE_ICONS: Record<string, typeof Camera> = {
  PHOTO: Camera,
  VIDEO: Video,
  AUDIO: Mic,
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  PHOTO: "Photo",
  VIDEO: "Vidéo",
  AUDIO: "Audio",
};

// ——— Interfaces ———

interface ScriptMedia {
  id: string;
  mediaType: string;
  description: string;
  outfit?: string;
  duration?: string;
  status: string;
  driveLink?: string;
  order: number;
}

interface ScriptElement {
  id: string;
  type: string;
  order: number;
  messageText?: string;
  waitDescription?: string;
  noteText?: string;
  price?: number;
  medias: ScriptMedia[];
}

interface ScriptStep {
  id: string;
  title: string;
  order: number;
  elements: ScriptElement[];
}

interface ModelScriptDetail {
  id: string;
  name: string;
  category: string;
  description?: string;
  steps: ScriptStep[];
}

// ——— Helpers ———

function getElementClasses(type: string): string {
  switch (type) {
    case "MESSAGE":
      return "border-l-[3px] border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20";
    case "FREE_CONTENT":
      return "border-l-[3px] border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20";
    case "PAID_CONTENT":
      return "border-l-[3px] border-l-gray-900 bg-gray-50 dark:border-l-gray-100 dark:bg-gray-900/30";
    case "WAIT":
      return "border-l-[3px] border-l-orange-400 bg-orange-50/50 dark:bg-orange-950/20";
    case "NOTE":
      return "border-l-[3px] border-l-dashed border-l-gray-300 bg-muted/50";
    default:
      return "";
  }
}

function computeMediaCounts(steps: ScriptStep[]): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const step of steps) {
    for (const el of step.elements) {
      for (const media of el.medias) {
        total++;
        if (media.status === "COMPLETED") completed++;
      }
    }
  }
  return { total, completed };
}

// ——— Component ———

export default function ModelScriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [script, setScript] = useState<ModelScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Track local edits for media tasks
  const [mediaEdits, setMediaEdits] = useState<
    Record<string, { status?: string; driveLink?: string }>
  >({});
  const [savingMediaId, setSavingMediaId] = useState<string | null>(null);

  const fetchScript = useCallback(async () => {
    try {
      const res = await fetch(`/api/scripts/my/${params.id}`);
      const json = await res.json();
      if (json.success) {
        setScript(json.data);
      }
    } catch (err) {
      console.error("[Script] Erreur chargement:", err);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  function getMediaEdit(mediaId: string, media: ScriptMedia) {
    const edit = mediaEdits[mediaId];
    return {
      status: edit?.status ?? media.status,
      driveLink: edit?.driveLink ?? media.driveLink ?? "",
    };
  }

  function updateMediaEdit(
    mediaId: string,
    field: "status" | "driveLink",
    value: string
  ) {
    setMediaEdits((prev) => ({
      ...prev,
      [mediaId]: {
        ...prev[mediaId],
        [field]: value,
      },
    }));
  }

  async function handleSaveMedia(mediaId: string, media: ScriptMedia) {
    const edit = getMediaEdit(mediaId, media);
    setSavingMediaId(mediaId);

    try {
      const res = await fetch(`/api/scripts/medias/${mediaId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: edit.status,
          driveLink: edit.driveLink.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMediaEdits((prev) => {
          const next = { ...prev };
          delete next[mediaId];
          return next;
        });
        fetchScript();
      }
    } catch (err) {
      console.error("[Script] Erreur sauvegarde média:", err);
    }
    setSavingMediaId(null);
  }

  // ——— Loading / error ———

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Script introuvable.
      </div>
    );
  }

  const { total: mediaTotal, completed: mediaCompleted } = computeMediaCounts(
    script.steps
  );
  const mediaPercent =
    mediaTotal > 0 ? Math.round((mediaCompleted / mediaTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={() => router.push("/model/scripts")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux scripts
      </Button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight">{script.name}</h1>
          <Badge
            variant="secondary"
            className={cn("text-xs", CATEGORY_COLORS[script.category])}
          >
            {CATEGORY_LABELS[script.category] || script.category}
          </Badge>
        </div>

        {/* Progress bar */}
        {mediaTotal > 0 && (
          <div className="space-y-2 max-w-md">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {mediaCompleted}/{mediaTotal} médias produits
              </span>
              <span className="font-medium">{mediaPercent}%</span>
            </div>
            <Progress value={mediaPercent} className="h-2" />
          </div>
        )}
      </div>

      {/* Description */}
      {script.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {script.description}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Timeline - read-only steps */}
      <div className="space-y-4">
        {script.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune étape</p>
        ) : (
          script.steps
            .sort((a, b) => a.order - b.order)
            .map((step, stepIndex) => (
              <Card key={step.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Step header */}
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white text-sm font-bold dark:bg-white dark:text-black">
                      {stepIndex + 1}
                    </span>
                    <span className="font-semibold text-sm">{step.title}</span>
                  </div>

                  {/* Elements */}
                  <div className="space-y-2 pl-11">
                    {step.elements
                      .sort((a, b) => a.order - b.order)
                      .map((element) => {
                        const isContext = element.type === "MESSAGE" || element.type === "WAIT" || element.type === "NOTE";

                        // Dimmed context elements (MESSAGE, WAIT, NOTE)
                        if (isContext) {
                          return (
                            <div
                              key={element.id}
                              className="border-l border-gray-200 dark:border-gray-800 rounded-sm py-1.5 px-3 opacity-40"
                            >
                              {element.type === "MESSAGE" && element.messageText && (
                                <p className="text-xs text-muted-foreground italic whitespace-pre-wrap line-clamp-2">
                                  {element.messageText}
                                </p>
                              )}
                              {element.type === "WAIT" && (
                                <p className="text-xs text-muted-foreground">
                                  ⏳ {element.waitDescription || "Attente réponse"}
                                </p>
                              )}
                              {element.type === "NOTE" && element.noteText && (
                                <p className="text-xs text-muted-foreground italic line-clamp-1">
                                  {element.noteText}
                                </p>
                              )}
                            </div>
                          );
                        }

                        // Prominent content elements (FREE_CONTENT, PAID_CONTENT)
                        return (
                        <div
                          key={element.id}
                          className={cn(
                            "rounded-md p-3",
                            getElementClasses(element.type)
                          )}
                        >
                          <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
                            {ELEMENT_TYPE_LABELS[element.type] || element.type}
                          </p>

                          {element.type === "PAID_CONTENT" &&
                            element.price !== undefined &&
                            element.price > 0 && (
                              <p className="text-sm font-medium mb-2">
                                {element.price}$
                              </p>
                            )}

                          {/* Media list for FREE_CONTENT and PAID_CONTENT */}
                          {(element.type === "FREE_CONTENT" ||
                            element.type === "PAID_CONTENT") &&
                            element.medias.length > 0 && (
                              <div className="space-y-3 mt-2">
                                {element.medias
                                  .sort((a, b) => a.order - b.order)
                                  .map((media) => {
                                    const edit = getMediaEdit(media.id, media);
                                    const hasChanges =
                                      edit.status !== media.status ||
                                      edit.driveLink !==
                                        (media.driveLink ?? "");
                                    const isSaving =
                                      savingMediaId === media.id;
                                    const Icon =
                                      MEDIA_TYPE_ICONS[media.mediaType] ||
                                      Camera;

                                    return (
                                      <div
                                        key={media.id}
                                        className="rounded-md border bg-background p-3 space-y-2"
                                      >
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Icon className="h-4 w-4 shrink-0" />
                                          <span className="text-sm font-medium">
                                            {MEDIA_TYPE_LABELS[
                                              media.mediaType
                                            ] || media.mediaType}
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className={cn(
                                              "text-xs",
                                              MEDIA_STATUS_COLORS[edit.status]
                                            )}
                                          >
                                            {MEDIA_STATUS_LABELS[
                                              edit.status
                                            ] || edit.status}
                                          </Badge>
                                        </div>

                                        <p className="text-sm">
                                          {media.description}
                                        </p>

                                        {media.outfit && (
                                          <p className="text-xs text-muted-foreground">
                                            Tenue : {media.outfit}
                                          </p>
                                        )}
                                        {media.duration && (
                                          <p className="text-xs text-muted-foreground">
                                            Durée : {media.duration}
                                          </p>
                                        )}

                                        <Separator />

                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">
                                              Statut
                                            </label>
                                            <Select
                                              value={edit.status}
                                              onValueChange={(v) =>
                                                updateMediaEdit(
                                                  media.id,
                                                  "status",
                                                  v
                                                )
                                              }
                                            >
                                              <SelectTrigger className="h-9">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="NOT_STARTED">
                                                  Non commencé
                                                </SelectItem>
                                                <SelectItem value="IN_PROGRESS">
                                                  En cours
                                                </SelectItem>
                                                <SelectItem value="COMPLETED">
                                                  Terminé
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">
                                              Lien Drive
                                            </label>
                                            <Input
                                              className="h-9"
                                              placeholder="https://drive.google.com/..."
                                              value={edit.driveLink}
                                              onChange={(e) =>
                                                updateMediaEdit(
                                                  media.id,
                                                  "driveLink",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </div>
                                        </div>

                                        {hasChanges && (
                                          <div className="flex justify-end">
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                handleSaveMedia(
                                                  media.id,
                                                  media
                                                )
                                              }
                                              disabled={isSaving}
                                            >
                                              {isSaving ? (
                                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                              ) : (
                                                <Save className="mr-2 h-3 w-3" />
                                              )}
                                              Sauvegarder
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                        </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}
