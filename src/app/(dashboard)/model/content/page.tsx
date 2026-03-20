"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Minus, Plus, ExternalLink, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Task {
  id: string;
  category: string;
  platform: string;
  targetQuantity: number;
  completedQuantity: number;
  status: string;
  driveLink: string | null;
}

const platformConfig: Record<
  string,
  { color: string; badgeClass: string }
> = {
  OnlyFans: {
    color: "border-l-pink-500",
    badgeClass: "bg-pink-500 text-white",
  },
  Instagram: {
    color: "border-l-blue-500",
    badgeClass: "bg-blue-500 text-white",
  },
  TikTok: {
    color: "border-l-slate-800",
    badgeClass: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  },
};

export default function ModelContentPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/tasks/my");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setTasks(json.data.tasks);
        setWeekStart(json.data.weekStart);
        setWeekEnd(json.data.weekEnd);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleProgress(taskId: string, delta: number) {
    const res = await fetch(`/api/content/tasks/${taskId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    const json = await res.json();
    if (json.success) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? json.data : t))
      );
    }
  }

  // Grouper par plateforme
  const groups: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (!groups[t.platform]) groups[t.platform] = [];
    groups[t.platform].push(t);
  }

  // Stats globales
  const totalTarget = tasks.reduce((s, t) => s + t.targetQuantity, 0);
  const totalDone = tasks.reduce((s, t) => s + t.completedQuantity, 0);
  const globalPct =
    totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Chargement...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Mon contenu</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Film className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Aucune tâche cette semaine</h3>
          <p className="text-sm text-muted-foreground">
            Le planning de contenu n&apos;a pas encore été généré
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon contenu</h1>
        <p className="text-sm text-muted-foreground">
          Semaine du{" "}
          {weekStart &&
            format(new Date(weekStart), "d MMMM", { locale: fr })}{" "}
          au{" "}
          {weekEnd &&
            format(new Date(weekEnd), "d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* Barre de progression globale */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression de la semaine</span>
            <span
              className={cn(
                "text-3xl font-bold",
                globalPct >= 100
                  ? "text-emerald-600"
                  : globalPct > 50
                    ? "text-blue-600"
                    : "text-orange-600"
              )}
            >
              {globalPct}%
            </span>
          </div>
          <Progress value={globalPct} className="h-3" />
          <p className="mt-1 text-xs text-muted-foreground">
            {totalDone}/{totalTarget} éléments complétés
          </p>
        </CardContent>
      </Card>

      {/* Cards par plateforme */}
      {Object.entries(groups).map(([platform, items]) => {
        const config = platformConfig[platform] || {
          color: "border-l-gray-400",
          badgeClass: "bg-gray-500 text-white",
        };
        const pTarget = items.reduce((s, t) => s + t.targetQuantity, 0);
        const pDone = items.reduce((s, t) => s + t.completedQuantity, 0);
        const pPct = pTarget > 0 ? Math.round((pDone / pTarget) * 100) : 0;

        return (
          <Card key={platform} className={cn("border-l-4", config.color)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", config.badgeClass)}>
                    {platform}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {pDone}/{pTarget}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold",
                    pPct >= 100
                      ? "text-emerald-600"
                      : pPct > 50
                        ? "text-blue-600"
                        : "text-muted-foreground"
                  )}
                >
                  {pPct}%
                </span>
              </div>
              <Progress value={pPct} className="h-1.5 mt-1" />
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {items.map((task) => {
                const pct =
                  task.targetQuantity > 0
                    ? Math.round(
                        (task.completedQuantity / task.targetQuantity) * 100
                      )
                    : 0;
                const isDone = task.completedQuantity >= task.targetQuantity;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-3 py-2.5",
                      isDone && "bg-emerald-50/50 dark:bg-emerald-950/10"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm flex-1 min-w-0 truncate",
                        isDone
                          ? "text-emerald-700 font-medium line-through"
                          : "font-medium"
                      )}
                    >
                      {task.category}
                    </span>

                    <span className="text-xs text-muted-foreground shrink-0 w-10 text-right">
                      {task.completedQuantity}/{task.targetQuantity}
                    </span>

                    <Progress
                      value={pct}
                      className="h-1.5 w-16 shrink-0"
                    />

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => handleProgress(task.id, -1)}
                        disabled={task.completedQuantity <= 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => handleProgress(task.id, 1)}
                        disabled={isDone}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {task.driveLink && (
                      <a
                        href={task.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
