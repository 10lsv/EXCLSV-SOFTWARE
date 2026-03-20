"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Film,
  Check,
  X,
  ExternalLink,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ModelOption {
  id: string;
  stageName: string;
}

interface Template {
  id: string;
  modelId: string;
  category: string;
  platform: string;
  quantity: number;
  driveLink: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Task {
  id: string;
  category: string;
  platform: string;
  targetQuantity: number;
  completedQuantity: number;
  status: string;
  driveLink: string | null;
}

const platformColors: Record<string, string> = {
  OnlyFans: "bg-pink-500 text-white",
  Instagram: "bg-blue-500 text-white",
  TikTok: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
};

function getMonday(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export default function AdminContentPage() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editDrive, setEditDrive] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPlatform, setNewPlatform] = useState("OnlyFans");
  const [newQuantity, setNewQuantity] = useState("");
  const [newDriveLink, setNewDriveLink] = useState("");
  const [_generating, setGenerating] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  const fetchModels = useCallback(async () => {
    const res = await fetch("/api/models?limit=100");
    const json = await res.json();
    if (json.success) {
      setModels(
        json.data.models.map((m: { id: string; stageName: string }) => ({
          id: m.id,
          stageName: m.stageName,
        }))
      );
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (!selectedModel) return;
    const res = await fetch(`/api/content/templates?modelId=${selectedModel}`);
    const json = await res.json();
    if (json.success) setTemplates(json.data);
  }, [selectedModel]);

  const fetchTasks = useCallback(async () => {
    if (!selectedModel) return;
    const ws = weekStart.toISOString().split("T")[0];
    const res = await fetch(
      `/api/content/tasks?modelId=${selectedModel}&weekStart=${ws}`
    );
    const json = await res.json();
    if (json.success) setTasks(json.data);
  }, [selectedModel, weekStart]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    if (selectedModel) {
      fetchTemplates();
      fetchTasks();
    }
  }, [selectedModel, fetchTemplates, fetchTasks]);

  async function handleCreateTemplate() {
    if (!newCategory || !newQuantity) return;
    await fetch("/api/content/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId: selectedModel,
        category: newCategory,
        platform: newPlatform,
        quantity: newQuantity,
        driveLink: newDriveLink || null,
      }),
    });
    setCreateOpen(false);
    setNewCategory("");
    setNewQuantity("");
    setNewDriveLink("");
    fetchTemplates();
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    await fetch(`/api/content/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  }

  async function handleSaveEdit(id: string) {
    await fetch(`/api/content/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: editQty,
        driveLink: editDrive,
      }),
    });
    setEditingId(null);
    fetchTemplates();
  }

  async function handleGenerate() {
    setGenerating(true);
    const ws = weekStart.toISOString().split("T")[0];
    await fetch("/api/content/tasks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: selectedModel, weekStart: ws }),
    });
    setGenerating(false);
    fetchTasks();
  }

  async function handleAdjustWeek() {
    if (!confirm("Regénérer les tâches de cette semaine depuis le template actuel ? Les tâches existantes seront remplacées.")) return;
    setAdjusting(true);
    const ws = weekStart.toISOString().split("T")[0];
    await fetch("/api/content/tasks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: selectedModel, weekStart: ws }),
    });
    setAdjusting(false);
    fetchTasks();
  }

  // Grouper par plateforme
  function groupByPlatform<T extends { platform: string }>(
    items: T[]
  ): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
      if (!groups[item.platform]) groups[item.platform] = [];
      groups[item.platform].push(item);
    }
    return groups;
  }

  const templateGroups = groupByPlatform(templates);
  const taskGroups = groupByPlatform(tasks);

  // Stats semaine
  const totalTarget = tasks.reduce((s, t) => s + t.targetQuantity, 0);
  const totalCompleted = tasks.reduce((s, t) => s + t.completedQuantity, 0);
  const weekPercent = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Contenu hebdomadaire
          </h1>
          <p className="text-sm text-muted-foreground">
            Templates et tâches de contenu par modèle
          </p>
        </div>
      </div>

      {/* Sélecteur de modèle */}
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Sélectionner une modèle" />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.stageName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedModel ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Film className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">
            Sélectionnez une modèle
          </h3>
          <p className="text-sm text-muted-foreground">
            pour voir ses templates et tâches de contenu
          </p>
        </div>
      ) : (
        <>
          {/* ═══ Section A — Templates ═══ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Template par défaut</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Ce template s&apos;applique automatiquement chaque semaine
                </p>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avertissement modification template */}
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Les modifications du template s&apos;appliqueront à partir de la semaine prochaine. Pour modifier la semaine en cours, utilisez &quot;Ajuster cette semaine&quot; ci-dessous.
                </p>
              </div>

              {Object.keys(templateGroups).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun template. Ajoutez des catégories de contenu.
                </p>
              ) : (
                Object.entries(templateGroups).map(([platform, items]) => (
                  <div key={platform} className="space-y-2">
                    <Badge className={cn("text-xs", platformColors[platform] || "bg-gray-500 text-white")}>
                      {platform}
                    </Badge>
                    <div className="space-y-1">
                      {items.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          {editingId === t.id ? (
                            <>
                              <span className="font-medium">{t.category}</span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="w-16 h-7 text-xs"
                                  value={editQty}
                                  onChange={(e) => setEditQty(e.target.value)}
                                />
                                <Input
                                  className="w-48 h-7 text-xs"
                                  placeholder="Lien Drive"
                                  value={editDrive}
                                  onChange={(e) => setEditDrive(e.target.value)}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleSaveEdit(t.id)}
                                >
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setEditingId(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <span className="font-medium">
                                  {t.category}
                                </span>
                                <span className="text-muted-foreground">
                                  {t.quantity}/sem
                                </span>
                                {t.driveLink && (
                                  <a
                                    href={t.driveLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingId(t.id);
                                    setEditQty(String(t.quantity));
                                    setEditDrive(t.driveLink || "");
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => handleDeleteTemplate(t.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* ═══ Section B — Semaine en cours ═══ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">
                  Semaine du{" "}
                  {format(weekStart, "d MMM", { locale: fr })} au{" "}
                  {format(weekEnd, "d MMM yyyy", { locale: fr })}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() =>
                    setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStart(getMonday(new Date()))}
                >
                  Aujourd&apos;hui
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() =>
                    setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdjustWeek}
                  disabled={adjusting}
                >
                  <Wrench
                    className={cn(
                      "mr-1 h-3.5 w-3.5",
                      adjusting && "animate-spin"
                    )}
                  />
                  Ajuster cette semaine
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barre de progression globale */}
              {tasks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      Progression globale
                    </span>
                    <span
                      className={cn(
                        "font-bold text-lg",
                        weekPercent >= 100
                          ? "text-emerald-600"
                          : weekPercent > 50
                            ? "text-blue-600"
                            : "text-orange-600"
                      )}
                    >
                      {weekPercent}%
                    </span>
                  </div>
                  <Progress value={weekPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {totalCompleted}/{totalTarget} éléments complétés
                  </p>
                </div>
              )}

              {tasks.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Aucune tâche pour cette semaine
                  </p>
                  <Button variant="outline" size="sm" onClick={handleGenerate}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Générer depuis le template
                  </Button>
                </div>
              ) : (
                Object.entries(taskGroups).map(([platform, items]) => {
                  const pTarget = items.reduce(
                    (s, t) => s + t.targetQuantity,
                    0
                  );
                  const pDone = items.reduce(
                    (s, t) => s + t.completedQuantity,
                    0
                  );
                  const pPct =
                    pTarget > 0 ? Math.round((pDone / pTarget) * 100) : 0;
                  return (
                    <div key={platform} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          className={cn(
                            "text-xs",
                            platformColors[platform] || "bg-gray-500 text-white"
                          )}
                        >
                          {platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {pPct}% — {pDone}/{pTarget}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {items.map((t) => {
                          const pct =
                            t.targetQuantity > 0
                              ? Math.round(
                                  (t.completedQuantity / t.targetQuantity) * 100
                                )
                              : 0;
                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                            >
                              <span className="font-medium flex-1 min-w-0 truncate">
                                {t.category}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {t.completedQuantity}/{t.targetQuantity}
                              </span>
                              <Progress
                                value={pct}
                                className="h-1.5 w-24 shrink-0"
                              />
                              <Badge
                                variant={
                                  t.status === "COMPLETED"
                                    ? "default"
                                    : "secondary"
                                }
                                className={cn(
                                  "text-[10px] shrink-0",
                                  t.status === "COMPLETED" &&
                                    "bg-emerald-500 text-white",
                                  t.status === "IN_PROGRESS" &&
                                    "bg-amber-500 text-white",
                                  t.status === "NOT_STARTED" &&
                                    "bg-red-500 text-white"
                                )}
                              >
                                {t.status === "COMPLETED"
                                  ? "Fait"
                                  : t.status === "IN_PROGRESS"
                                    ? "En cours"
                                    : "À faire"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog création template */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une catégorie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Ex: Lingerie Pictures"
              />
            </div>
            <div className="space-y-2">
              <Label>Plateforme *</Label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OnlyFans">OnlyFans</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantité par semaine *</Label>
              <Input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="7"
              />
            </div>
            <div className="space-y-2">
              <Label>Lien Google Drive</Label>
              <Input
                value={newDriveLink}
                onChange={(e) => setNewDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <Button className="w-full" onClick={handleCreateTemplate}>
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
