"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Camera,
  Video,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaTable, flattenMedias } from "@/components/scripts/media-table";

const CATEGORY_COLORS: Record<string, string> = {
  UPSELL: "bg-violet-100 text-violet-700",
  SEXTING: "bg-pink-100 text-pink-700",
  RETENTION: "bg-blue-100 text-blue-700",
  FIRST_MESSAGE: "bg-green-100 text-green-700",
  MASS_DM: "bg-orange-100 text-orange-700",
  CUSTOM_PROMO: "bg-yellow-100 text-yellow-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  UPSELL: "Upsell", SEXTING: "Sexting", RETENTION: "Rétention",
  FIRST_MESSAGE: "Premier message", MASS_DM: "Mass DM", CUSTOM_PROMO: "Promo custom",
};

const ELEMENT_COLORS: Record<string, string> = {
  MESSAGE: "border-l-[3px] border-l-blue-500 bg-blue-50/30",
  FREE_CONTENT: "border-l-[3px] border-l-emerald-500 bg-emerald-50/30",
  PAID_CONTENT: "border-l-[3px] border-l-gray-900 bg-gray-50/50",
  WAIT: "border-l-[3px] border-l-orange-400 bg-orange-50/30",
  NOTE: "border-l-[3px] border-l-dashed border-l-gray-300 bg-muted/30",
};

const MEDIA_ICONS: Record<string, typeof Camera> = { PHOTO: Camera, VIDEO: Video, AUDIO: Mic };
const MEDIA_LABELS: Record<string, string> = { PHOTO: "Photo", VIDEO: "Vidéo", AUDIO: "Audio" };
const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
};

interface ScriptDetail {
  id: string;
  name: string;
  category: string;
  description?: string;
  driveFolder?: string | null;
  steps: Array<{
    id: string;
    title: string;
    order: number;
    elements: Array<{
      id: string;
      type: string;
      order: number;
      messageText?: string;
      waitDescription?: string;
      noteText?: string;
      price?: number | null;
      medias: Array<{
        id: string;
        mediaType: string;
        description: string;
        outfit?: string | null;
        duration?: string | null;
        status: string;
        order: number;
      }>;
    }>;
  }>;
}

export default function ModelScriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScript = useCallback(async () => {
    try {
      const res = await fetch(`/api/scripts/my/${params.id}`);
      const json = await res.json();
      if (json.success) setScript(json.data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchScript(); }, [fetchScript]);

  async function handleStatusChange(mediaId: string, status: string) {
    try {
      await fetch(`/api/scripts/medias/${mediaId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchScript();
    } catch {
      // ignore
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!script) return <div className="py-20 text-center text-muted-foreground">Script introuvable.</div>;

  const allMedias = flattenMedias(script.steps);
  const completed = allMedias.filter((m) => m.status === "COMPLETED").length;
  const total = allMedias.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/model/scripts")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux scripts
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold tracking-tight">{script.name}</h1>
        <Badge variant="secondary" className={cn("text-xs", CATEGORY_COLORS[script.category])}>
          {CATEGORY_LABELS[script.category] || script.category}
        </Badge>
      </div>

      {/* ═══ SECTION 1: Contenus à produire ═══ */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium shrink-0">Contenus à produire</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        {total > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <Progress value={pct} className="h-2" />
              <span className="text-sm text-muted-foreground shrink-0">{completed}/{total} produits</span>
            </div>
            {script.driveFolder ? (
              <a href={script.driveFolder} target="_blank" rel="noopener noreferrer">
                <Button>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Déposer le contenu
                </Button>
              </a>
            ) : (
              <Button disabled title="Aucun dossier Drive configuré">
                <ExternalLink className="mr-2 h-4 w-4" />
                Déposer le contenu
              </Button>
            )}
          </div>
        )}

        <MediaTable
          medias={allMedias}
          editable={true}
          driveFolder={script.driveFolder ?? null}
          showDriveColumn={false}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* ═══ SECTION 2: Script complet ═══ */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium shrink-0">Script complet</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>
        <p className="text-xs text-muted-foreground">Lisez le script pour comprendre le contexte des contenus</p>

        {script.description && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{script.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Timeline read-only */}
        <div className="space-y-4">
          {script.steps.sort((a, b) => a.order - b.order).map((step, si) => (
            <Card key={step.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-white text-xs font-bold dark:bg-white dark:text-black">
                    {si + 1}
                  </span>
                  <span className="font-semibold text-sm">{step.title}</span>
                </div>

                <div className="space-y-2 pl-10">
                  {step.elements.sort((a, b) => a.order - b.order).map((el) => (
                    <div key={el.id} className={cn("rounded-md p-3", ELEMENT_COLORS[el.type])}>
                      {el.type === "MESSAGE" && el.messageText && (
                        <p className="text-sm whitespace-pre-wrap">{el.messageText}</p>
                      )}
                      {el.type === "WAIT" && (
                        <p className="text-sm text-muted-foreground">{el.waitDescription || "Attente réponse"}</p>
                      )}
                      {el.type === "NOTE" && el.noteText && (
                        <p className="text-sm italic text-muted-foreground">{el.noteText}</p>
                      )}
                      {el.type === "PAID_CONTENT" && el.price && (
                        <p className="text-xs font-medium mb-1">{el.price}$ — PPV</p>
                      )}
                      {(el.type === "FREE_CONTENT" || el.type === "PAID_CONTENT") && (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            {el.type === "FREE_CONTENT" ? "Contenu gratuit" : "Contenu payant"}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {el.medias.sort((a, b) => a.order - b.order).map((media) => {
                              const Icon = MEDIA_ICONS[media.mediaType] || Camera;
                              return (
                                <div key={media.id} className="flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate max-w-[120px]">{media.description}</span>
                                  <Badge variant="secondary" className={cn("text-[10px] px-1 py-0", STATUS_COLORS[media.status])}>
                                    {media.status === "COMPLETED" ? "Fait" : media.status === "IN_PROGRESS" ? "En cours" : "À faire"}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
