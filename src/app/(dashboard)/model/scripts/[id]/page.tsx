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
  MessageSquare,
  Image,
  Video,
  Mic,
  Layers,
  Clock,
  StickyNote,
  Unlock,
  Lock,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const STEP_TYPE_LABELS: Record<string, string> = {
  message: "Message",
  free_content: "Contenu gratuit",
  paid_content: "Contenu payant",
  vocal: "Vocal",
  wait: "Attente",
  internal_note: "Note interne",
};

const STEP_TYPE_ICONS: Record<string, React.ReactNode> = {
  message: <MessageSquare className="h-4 w-4" />,
  free_content: <Unlock className="h-4 w-4" />,
  paid_content: <Lock className="h-4 w-4" />,
  vocal: <Mic className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />,
  internal_note: <StickyNote className="h-4 w-4" />,
};

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  PHOTO: <Image className="h-4 w-4" />,
  VIDEO: <Video className="h-4 w-4" />,
  AUDIO: <Mic className="h-4 w-4" />,
  COMBO: <Layers className="h-4 w-4" />,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  PHOTO: "Photo",
  VIDEO: "Vidéo",
  AUDIO: "Audio",
  COMBO: "Combo",
};

const CONTENT_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  IN_PROGRESS: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const CONTENT_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
};

interface ScriptStep {
  id: string;
  sortOrder: number;
  type: string;
  content: string;
  title?: string;
  notes?: string;
  price?: number;
  waitDuration?: string;
}

interface ScriptContentTask {
  id: string;
  contentType: string;
  description: string;
  duration?: string;
  outfit?: string;
  status: string;
  driveLink?: string;
}

interface ModelScriptDetail {
  id: string;
  name: string;
  category: string;
  description?: string;
  steps: ScriptStep[];
  contentTasks: ScriptContentTask[];
}

export default function ModelScriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [script, setScript] = useState<ModelScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Track local edits for content tasks
  const [taskEdits, setTaskEdits] = useState<
    Record<string, { status?: string; driveLink?: string }>
  >({});
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const fetchScript = useCallback(async () => {
    const res = await fetch(`/api/scripts/my/${params.id}`);
    const json = await res.json();
    if (json.success) {
      setScript(json.data);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  function getTaskEdit(taskId: string, task: ScriptContentTask) {
    const edit = taskEdits[taskId];
    return {
      status: edit?.status ?? task.status,
      driveLink: edit?.driveLink ?? task.driveLink ?? "",
    };
  }

  function updateTaskEdit(
    taskId: string,
    field: "status" | "driveLink",
    value: string
  ) {
    setTaskEdits((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value,
      },
    }));
  }

  async function handleSaveTask(taskId: string, task: ScriptContentTask) {
    const edit = getTaskEdit(taskId, task);
    setSavingTaskId(taskId);

    const res = await fetch(`/api/scripts/content/${taskId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: edit.status,
        driveLink: edit.driveLink.trim() || undefined,
      }),
    });

    const json = await res.json();
    if (json.success) {
      // Clear local edit
      setTaskEdits((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      fetchScript();
    }
    setSavingTaskId(null);
  }

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

  const contentTotal = script.contentTasks.length;
  const contentDone = script.contentTasks.filter(
    (c) => c.status === "COMPLETED"
  ).length;
  const contentPercent =
    contentTotal > 0 ? Math.round((contentDone / contentTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={() => router.push("/model/scripts")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux scripts
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold tracking-tight">{script.name}</h1>
          <Badge
            variant="secondary"
            className={cn("text-xs", CATEGORY_COLORS[script.category])}
          >
            {CATEGORY_LABELS[script.category] || script.category}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      {contentTotal > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {contentDone}/{contentTotal} contenus produits
            </span>
            <span className="font-medium">{contentPercent}%</span>
          </div>
          <Progress value={contentPercent} className="h-2" />
        </div>
      )}

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

      {/* Steps section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Script</h2>
        {script.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune étape</p>
        ) : (
          <div className="space-y-3">
            {script.steps
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((step, index) => (
                <Card key={step.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {step.title && (
                            <span className="font-semibold">{step.title}</span>
                          )}
                          <Badge variant="outline" className="text-xs gap-1">
                            {STEP_TYPE_ICONS[step.type]}
                            {STEP_TYPE_LABELS[step.type] || step.type}
                          </Badge>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {step.content}
                        </p>
                        {step.notes && (
                          <p className="text-sm italic text-muted-foreground">
                            {step.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Content tasks section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Contenus à produire</h2>
        {script.contentTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun contenu requis
          </p>
        ) : (
          <div className="space-y-3">
            {script.contentTasks.map((task) => {
              const edit = getTaskEdit(task.id, task);
              const hasChanges =
                edit.status !== task.status ||
                edit.driveLink !== (task.driveLink ?? "");
              const isSaving = savingTaskId === task.id;

              return (
                <Card key={task.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {CONTENT_TYPE_ICONS[task.contentType]}
                        {CONTENT_TYPE_LABELS[task.contentType] || task.contentType}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          CONTENT_STATUS_COLORS[edit.status]
                        )}
                      >
                        {CONTENT_STATUS_LABELS[edit.status] || edit.status}
                      </Badge>
                    </div>

                    <p className="text-sm">{task.description}</p>

                    {task.outfit && (
                      <p className="text-xs text-muted-foreground">
                        Tenue : {task.outfit}
                      </p>
                    )}
                    {task.duration && (
                      <p className="text-xs text-muted-foreground">
                        Durée : {task.duration}
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
                            updateTaskEdit(task.id, "status", v)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NOT_STARTED">Non commencé</SelectItem>
                            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                            <SelectItem value="COMPLETED">Terminé</SelectItem>
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
                            updateTaskEdit(task.id, "driveLink", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {hasChanges && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleSaveTask(task.id, task)}
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
