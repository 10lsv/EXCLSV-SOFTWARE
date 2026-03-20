"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Minus,
  Plus,
  ExternalLink,
  Film,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
} from "lucide-react";
import { cn, getMondayUTC } from "@/lib/utils";
import { format, addDays, isToday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

interface PlanEntry {
  id: string;
  taskId: string;
  plannedDate: string;
  quantity: number;
}

interface Task {
  id: string;
  category: string;
  platform: string;
  targetQuantity: number;
  completedQuantity: number;
  status: string;
  driveLink: string | null;
  planEntries: PlanEntry[];
}

const platformConfig: Record<
  string,
  { color: string; badgeClass: string; calBadge: string }
> = {
  OnlyFans: {
    color: "border-l-pink-500",
    badgeClass: "bg-pink-500 text-white",
    calBadge: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800",
  },
  Instagram: {
    color: "border-l-blue-500",
    badgeClass: "bg-blue-500 text-white",
    calBadge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  TikTok: {
    color: "border-l-slate-800",
    badgeClass: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
    calBadge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
  },
};

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function ModelContentPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  // Planning form state
  const [planningTaskId, setPlanningTaskId] = useState<string | null>(null);
  const [planDay, setPlanDay] = useState(0);
  const [planQty, setPlanQty] = useState(1);
  const [planLoading, setPlanLoading] = useState(false);

  // Move entry state
  const [movingEntry, setMovingEntry] = useState<PlanEntry | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (weekOffset !== 0) {
        const monday = getMondayUTC();
        monday.setUTCDate(monday.getUTCDate() + weekOffset * 7);
        params.set("weekStart", monday.toISOString());
      }
      const res = await fetch(`/api/content/tasks/my/planning?${params}`);
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
  }, [weekOffset]);

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
        prev.map((t) =>
          t.id === taskId ? { ...t, ...json.data, planEntries: t.planEntries } : t
        )
      );
    }
  }

  async function handlePlanSubmit() {
    if (!planningTaskId) return;
    setPlanLoading(true);

    const monday = new Date(weekStart);
    const plannedDate = addDays(monday, planDay);

    const res = await fetch(`/api/content/tasks/${planningTaskId}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedDate: plannedDate.toISOString(),
        quantity: planQty,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === planningTaskId
            ? { ...t, planEntries: [...t.planEntries, json.data] }
            : t
        )
      );
      setPlanningTaskId(null);
      setPlanQty(1);
    }
    setPlanLoading(false);
  }

  async function handleDeleteEntry(entryId: string) {
    const res = await fetch(`/api/content/plan/${entryId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          planEntries: t.planEntries.filter((e) => e.id !== entryId),
        }))
      );
      setMovingEntry(null);
    }
  }

  async function handleMoveEntry(entry: PlanEntry, newDayIndex: number) {
    // Delete old, create new
    await handleDeleteEntry(entry.id);
    const monday = new Date(weekStart);
    const plannedDate = addDays(monday, newDayIndex);

    const res = await fetch(`/api/content/tasks/${entry.taskId}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedDate: plannedDate.toISOString(),
        quantity: entry.quantity,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === entry.taskId
            ? { ...t, planEntries: [...t.planEntries, json.data] }
            : t
        )
      );
    }
    setMovingEntry(null);
  }

  // Build week days
  const weekDays = weekStart
    ? Array.from({ length: 7 }, (_, i) => addDays(new Date(weekStart), i))
    : [];

  // Get entries for a specific day
  function getEntriesForDay(dayDate: Date) {
    const entries: (PlanEntry & { task: Task })[] = [];
    for (const task of tasks) {
      for (const entry of task.planEntries) {
        if (isSameDay(new Date(entry.plannedDate), dayDate)) {
          entries.push({ ...entry, task });
        }
      }
    }
    return entries;
  }

  // Unplanned tasks (where planned qty < target)
  function getUnplannedTasks() {
    return tasks
      .map((t) => {
        const planned = t.planEntries.reduce((s, e) => s + e.quantity, 0);
        const remaining = t.targetQuantity - planned;
        return { task: t, planned, remaining };
      })
      .filter((x) => x.remaining > 0);
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

  const unplannedTasks = getUnplannedTasks();

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

      {/* ─── Calendrier hebdomadaire ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Planning de la semaine</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setWeekOffset(0)}
              >
                Aujourd&apos;hui
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setWeekOffset((o) => o + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto -mx-6 px-6 pb-2">
            <div className="grid grid-cols-7 gap-1.5 min-w-[560px]">
              {weekDays.map((day, i) => {
                const entries = getEntriesForDay(day);
                const dayTotal = entries.reduce((s, e) => s + e.quantity, 0);
                const today = isToday(day);

                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-2 min-h-[120px] flex flex-col",
                      today && "border-primary border-2 bg-primary/5",
                      dayTotal >= 5 && "bg-amber-50/50 dark:bg-amber-950/10",
                      dayTotal >= 8 && "bg-orange-50/50 dark:bg-orange-950/10"
                    )}
                  >
                    {/* Header du jour */}
                    <div className="text-center mb-1.5">
                      <div
                        className={cn(
                          "text-[10px] font-medium uppercase tracking-wider",
                          today ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {DAY_LABELS[i]}
                      </div>
                      <div
                        className={cn(
                          "text-xs",
                          today ? "font-bold text-primary" : "text-muted-foreground"
                        )}
                      >
                        {format(day, "dd/MM")}
                      </div>
                    </div>

                    {/* Badges des tâches */}
                    <div className="flex-1 space-y-1">
                      {entries.map((entry) => {
                        const config =
                          platformConfig[entry.task.platform] || {
                            calBadge: "bg-gray-100 text-gray-700 border-gray-200",
                          };
                        return (
                          <button
                            key={entry.id}
                            onClick={() =>
                              setMovingEntry(
                                movingEntry?.id === entry.id ? null : entry
                              )
                            }
                            className={cn(
                              "w-full text-left rounded border px-1.5 py-0.5 text-[10px] font-medium truncate transition-all cursor-pointer hover:opacity-80",
                              config.calBadge,
                              movingEntry?.id === entry.id &&
                                "ring-2 ring-primary ring-offset-1"
                            )}
                            title={`${entry.task.category} (${entry.quantity}) — Cliquer pour déplacer`}
                          >
                            {entry.task.category}
                            {entry.quantity > 1 && ` (${entry.quantity})`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Move buttons si une entrée est sélectionnée et ce n'est pas le jour actuel de l'entrée */}
                    {movingEntry &&
                      !isSameDay(new Date(movingEntry.plannedDate), day) && (
                        <button
                          onClick={() => handleMoveEntry(movingEntry, i)}
                          className="mt-1 w-full rounded border border-dashed border-primary/40 bg-primary/5 py-0.5 text-[9px] text-primary hover:bg-primary/10 transition-colors"
                        >
                          Déplacer ici
                        </button>
                      )}

                    {/* Footer : total du jour */}
                    {dayTotal > 0 && (
                      <div className="mt-1 text-center text-[10px] text-muted-foreground font-medium border-t pt-1">
                        {dayTotal} contenu{dayTotal > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions sur l'entrée sélectionnée */}
          {movingEntry && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5 text-sm">
              <span className="flex-1 text-xs">
                <strong>
                  {tasks.find((t) => t.id === movingEntry.taskId)?.category}
                </strong>{" "}
                ({movingEntry.quantity}) — Cliquer sur un jour pour déplacer
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleDeleteEntry(movingEntry.id)}
              >
                <X className="h-3 w-3 mr-1" />
                Retirer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMovingEntry(null)}
              >
                Annuler
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Contenu à planifier ─── */}
      {unplannedTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contenu à planifier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {unplannedTasks.map(({ task, planned, remaining }) => {
              const config = platformConfig[task.platform] || {
                badgeClass: "bg-gray-500 text-white",
              };
              const isOpen = planningTaskId === task.id;

              return (
                <div key={task.id} className="rounded-md border">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Badge
                      className={cn("text-[10px] shrink-0", config.badgeClass)}
                    >
                      {task.platform}
                    </Badge>
                    <span className="text-sm font-medium flex-1 truncate">
                      {task.category}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {remaining}/{task.targetQuantity} restant{remaining > 1 ? "s" : ""}
                    </span>
                    <Button
                      variant={isOpen ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => {
                        if (isOpen) {
                          setPlanningTaskId(null);
                        } else {
                          setPlanningTaskId(task.id);
                          setPlanQty(1);
                          setPlanDay(0);
                        }
                      }}
                    >
                      {isOpen ? "Annuler" : "Planifier"}
                    </Button>
                  </div>

                  {/* Formulaire inline */}
                  {isOpen && (
                    <div className="border-t bg-muted/30 px-3 py-2.5 flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground">Jour :</label>
                        <select
                          className="h-7 rounded border bg-background px-2 text-xs"
                          value={planDay}
                          onChange={(e) => setPlanDay(Number(e.target.value))}
                        >
                          {weekDays.map((d, i) => (
                            <option key={i} value={i}>
                              {DAY_LABELS[i]} {format(d, "dd/MM")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground">Qté :</label>
                        <input
                          type="number"
                          min={1}
                          max={remaining}
                          value={planQty}
                          onChange={(e) =>
                            setPlanQty(
                              Math.max(1, Math.min(remaining, Number(e.target.value)))
                            )
                          }
                          className="h-7 w-14 rounded border bg-background px-2 text-xs text-center"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handlePlanSubmit}
                        disabled={planLoading}
                      >
                        {planLoading ? "..." : "Confirmer"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Barre de progression globale ─── */}
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

      {/* ─── Cards par plateforme ─── */}
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
