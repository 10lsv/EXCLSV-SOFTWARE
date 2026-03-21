"use client";

import { Badge } from "@/components/ui/badge";
import { Camera, Video, Mic, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaRow {
  mediaId: string;
  stepOrder: number;
  stepTitle: string;
  elementType: string;
  elementPrice?: number | null;
  mediaType: string;
  description: string;
  outfit: string | null;
  duration: string | null;
  status: string;
}

const MEDIA_ICONS: Record<string, typeof Camera> = {
  PHOTO: Camera,
  VIDEO: Video,
  AUDIO: Mic,
};

const MEDIA_LABELS: Record<string, string> = {
  PHOTO: "Photo",
  VIDEO: "Vidéo",
  AUDIO: "Audio",
};

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "text-red-500",
  IN_PROGRESS: "text-amber-500",
  COMPLETED: "text-green-600",
};

interface MediaTableProps {
  medias: MediaRow[];
  editable: boolean;
  driveFolder: string | null;
  showDriveColumn: boolean;
  onStatusChange: (mediaId: string, status: string) => void;
}

export function MediaTable({
  medias,
  editable,
  driveFolder,
  showDriveColumn,
  onStatusChange,
}: MediaTableProps) {
  if (medias.length === 0) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white dark:bg-background">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Camera className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucun contenu à produire — ajoutez des médias dans les étapes ci-dessus
          </p>
        </div>
      </div>
    );
  }

  const cols = showDriveColumn ? 7 : 6;

  return (
    <div className="rounded-lg border border-gray-100 overflow-hidden bg-white dark:bg-background">
      {/* Header */}
      <div
        className={cn(
          "hidden md:grid gap-2 py-3 px-4 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100",
          showDriveColumn ? "grid-cols-[7rem_5rem_1fr_7rem_6rem_9rem_2.5rem]" : "grid-cols-[7rem_5rem_1fr_7rem_6rem_9rem]"
        )}
      >
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Étape</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Type</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Média</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Tenue</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Durée</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Statut</span>
        {showDriveColumn && <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Drive</span>}
      </div>

      {/* Rows */}
      {medias.map((m, i) => {
        const Icon = MEDIA_ICONS[m.mediaType] || Camera;
        const isLast = i === medias.length - 1;

        return (
          <div
            key={m.mediaId}
            className={cn(
              "grid grid-cols-1 md:gap-2 py-3 px-4 items-center transition-colors duration-150 hover:bg-gray-50/50 dark:hover:bg-gray-900/20",
              !isLast && "border-b border-gray-50",
              showDriveColumn ? "md:grid-cols-[7rem_5rem_1fr_7rem_6rem_9rem_2.5rem]" : "md:grid-cols-[7rem_5rem_1fr_7rem_6rem_9rem]"
            )}
          >
            {/* Step */}
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white text-[10px] font-bold dark:bg-white dark:text-black">
                {m.stepOrder + 1}
              </span>
              <span className="text-xs text-muted-foreground truncate">{m.stepTitle}</span>
            </div>

            {/* Type */}
            <div>
              {m.elementType === "PAID_CONTENT" ? (
                <Badge className="bg-black text-white dark:bg-white dark:text-black text-[10px] px-1.5 py-0 border-0">
                  Payant{m.elementPrice ? ` $${m.elementPrice}` : ""}
                </Badge>
              ) : (
                <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-[10px] px-1.5 py-0 border-0">
                  Gratuit
                </Badge>
              )}
            </div>

            {/* Media */}
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{MEDIA_LABELS[m.mediaType] || m.mediaType}</span>
              <span className="text-sm text-muted-foreground truncate">— {m.description}</span>
            </div>

            {/* Outfit */}
            <span className="text-sm text-muted-foreground">{m.outfit || "—"}</span>

            {/* Duration */}
            <span className="text-sm text-muted-foreground">{m.duration || "—"}</span>

            {/* Status */}
            <div>
              {editable ? (
                <select
                  className={cn(
                    "text-xs font-medium border rounded-md px-2 h-7 bg-background w-full",
                    STATUS_STYLES[m.status]
                  )}
                  value={m.status}
                  onChange={(e) => onStatusChange(m.mediaId, e.target.value)}
                >
                  <option value="NOT_STARTED">Non commencé</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Terminé</option>
                </select>
              ) : (
                <Badge variant="secondary" className={cn("text-[10px]", STATUS_STYLES[m.status])}>
                  {m.status === "NOT_STARTED" ? "Non commencé" : m.status === "IN_PROGRESS" ? "En cours" : "Terminé"}
                </Badge>
              )}
            </div>

            {/* Drive */}
            {showDriveColumn && (
              <div className="flex justify-center">
                {driveFolder ? (
                  <a href={driveFolder} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <ExternalLink className="h-3.5 w-3.5 text-gray-200" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Flatten script data into MediaRow[] */
export function flattenMedias(steps: Array<{
  order: number;
  title: string;
  elements: Array<{
    type: string;
    price?: number | null;
    medias: Array<{
      id: string;
      mediaType: string;
      description: string;
      outfit?: string | null;
      duration?: string | null;
      status: string;
    }>;
  }>;
}>): MediaRow[] {
  const rows: MediaRow[] = [];
  for (const step of steps) {
    for (const el of step.elements) {
      if (el.type !== "FREE_CONTENT" && el.type !== "PAID_CONTENT") continue;
      for (const media of el.medias) {
        rows.push({
          mediaId: media.id,
          stepOrder: step.order,
          stepTitle: step.title,
          elementType: el.type,
          elementPrice: el.price,
          mediaType: media.mediaType,
          description: media.description,
          outfit: media.outfit ?? null,
          duration: media.duration ?? null,
          status: media.status,
        });
      }
    }
  }
  return rows;
}
