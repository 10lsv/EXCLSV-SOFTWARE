"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  FileText,
  CheckCircle2,
  FileEdit,
  Clock,
  Loader2,
  Copy,
  TrendingUp,
  DollarSign,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ModelOption {
  id: string;
  stageName: string;
  photoUrl?: string | null;
}

interface ScriptListItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  status: "DRAFT" | "VALIDATED";
  tags: string[];
  model: { id: string; stageName: string; photoUrl?: string | null };
  stepsCount: number;
  totalMedias: number;
  completedMedias: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

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

function getCardBorder(s: ScriptListItem): string {
  if (s.status === "DRAFT") return "border-l-4 border-l-gray-300";
  if (s.totalMedias > 0 && s.completedMedias === s.totalMedias) return "border-l-4 border-l-green-500";
  return "border-l-4 border-l-blue-500";
}

export default function AdminScriptsPage() {
  const router = useRouter();
  const [allScripts, setAllScripts] = useState<ScriptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [filterModel, setFilterModel] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  // Fetch ALL scripts (no server-side filter — we filter client-side for KPI recalc)
  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scripts");
      const json = await res.json();
      if (json.success) setAllScripts(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models?limit=100");
      const json = await res.json();
      if (json.success) setModels(json.data.models.map((m: ModelOption) => ({ id: m.id, stageName: m.stageName, photoUrl: m.photoUrl })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);
  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  async function handleDuplicate(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDuplicating(id);
    try {
      const res = await fetch(`/api/scripts/${id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (json.success) fetchScripts();
    } catch { /* ignore */ }
    setDuplicating(null);
  }

  // ─── Filtered scripts (for display list) ───
  const scripts = useMemo(() => {
    return allScripts.filter((s) => {
      if (filterModel && s.model.id !== filterModel) return false;
      if (filterCategory && s.category !== filterCategory) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      return true;
    });
  }, [allScripts, filterModel, filterCategory, filterStatus]);

  // ─── KPIs recalculated from filtered scripts ───
  const kpis = useMemo(() => {
    const ready = scripts.filter((s) => s.status === "VALIDATED" && s.totalMedias > 0 && s.completedMedias === s.totalMedias);
    const inProd = scripts.filter((s) => s.status === "VALIDATED" && (s.totalMedias === 0 || s.completedMedias < s.totalMedias));
    const drafts = scripts.filter((s) => s.status === "DRAFT");
    const totalMedias = scripts.reduce((a, s) => a + s.totalMedias, 0);
    const completedMedias = scripts.reduce((a, s) => a + s.completedMedias, 0);
    // We need NOT_STARTED count — it's totalMedias - completedMedias - inProgress
    // Since API doesn't give per-status breakdown, approximate: notStarted = totalMedias - completedMedias (includes IN_PROGRESS)
    const pendingMedias = totalMedias - completedMedias;
    const prodRate = totalMedias > 0 ? Math.round((completedMedias / totalMedias) * 100) : 0;
    const readyRevenue = ready.reduce((a, s) => a + s.totalPrice, 0);

    return { total: scripts.length, ready: ready.length, inProd: inProd.length, drafts: drafts.length, totalMedias, completedMedias, pendingMedias, prodRate, readyRevenue };
  }, [scripts]);

  // ─── Category distribution (from filtered scripts) ───
  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    scripts.forEach((s) => { map[s.category] = (map[s.category] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [scripts]);

  // ─── Model overview table (from ALL scripts, not filtered) ───
  const modelStats = useMemo(() => {
    const map = new Map<string, {
      model: ScriptListItem["model"];
      total: number;
      ready: number;
      inProd: number;
      totalMedias: number;
      completedMedias: number;
      revenue: number;
    }>();

    allScripts.forEach((s) => {
      const existing = map.get(s.model.id) || {
        model: s.model, total: 0, ready: 0, inProd: 0, totalMedias: 0, completedMedias: 0, revenue: 0,
      };
      existing.total++;
      if (s.status === "VALIDATED" && s.totalMedias > 0 && s.completedMedias === s.totalMedias) {
        existing.ready++;
        existing.revenue += s.totalPrice;
      } else if (s.status === "VALIDATED") {
        existing.inProd++;
      }
      existing.totalMedias += s.totalMedias;
      existing.completedMedias += s.completedMedias;
      map.set(s.model.id, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [allScripts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scripts</h1>
          <p className="text-sm text-muted-foreground">Gérez vos scripts de vente et conversations</p>
        </div>
        <Button onClick={() => router.push("/admin/scripts/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau script
        </Button>
      </div>

      {/* Divider: Scripts */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium shrink-0">Scripts</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Row 1 — Script stats (4 cards) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total scripts</span>
            </div>
            <p className="text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileEdit className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Brouillons</span>
            </div>
            <p className="text-2xl font-bold text-gray-500">{kpis.drafts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">En production</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{kpis.inProd}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Prêts à l&apos;emploi</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{kpis.ready}</p>
          </CardContent>
        </Card>
      </div>

      {/* Divider: Contenus */}
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium shrink-0">Contenus à produire</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Row 2 — Media status (3 cards) */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-950">
              <CircleDot className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis.pendingMedias}</p>
              <p className="text-xs text-muted-foreground">Non commencé</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-950">
              <Loader2 className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis.completedMedias}</p>
              <p className="text-xs text-muted-foreground">Terminé</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {kpis.totalMedias > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${kpis.prodRate}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {kpis.completedMedias}/{kpis.totalMedias} médias produits
          </span>
        </div>
      )}

      {/* Category badges */}
      {catCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterCategory("")}
            className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", !filterCategory ? "bg-foreground text-background" : "hover:bg-muted")}
          >
            Tous
          </button>
          {catCounts.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", filterCategory === cat ? "ring-2 ring-offset-1 ring-primary" : "", CATEGORY_COLORS[cat])}
            >
              {CATEGORY_LABELS[cat] || cat} ×{count}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterModel || "all"} onValueChange={(v) => setFilterModel(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tous les modèles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modèles</SelectItem>
            {models.map((m) => (<SelectItem key={m.id} value={m.id}>{m.stageName}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="DRAFT">Brouillon</SelectItem>
            <SelectItem value="VALIDATED">Validé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Script list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement...
        </div>
      ) : scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Aucun script</h3>
          <p className="mb-4 text-sm text-muted-foreground">Créez votre premier script de vente</p>
          <Button onClick={() => router.push("/admin/scripts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau script
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {scripts.map((script) => {
            const mediaPercent = script.totalMedias > 0 ? Math.round((script.completedMedias / script.totalMedias) * 100) : 0;
            return (
              <Card
                key={script.id}
                className={cn("cursor-pointer transition-colors hover:bg-muted/50", getCardBorder(script))}
                onClick={() => router.push(`/admin/scripts/${script.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-base">{script.name}</h3>
                        <Badge variant="secondary" className={cn("text-xs", CATEGORY_COLORS[script.category])}>
                          {CATEGORY_LABELS[script.category] || script.category}
                        </Badge>
                        <Badge variant="outline" className={cn("text-xs", script.status === "VALIDATED" ? "border-green-500 text-green-600" : "border-gray-400 text-gray-500")}>
                          {script.status === "VALIDATED" ? "Validé" : "Brouillon"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={script.model.photoUrl || undefined} />
                            <AvatarFallback className="text-[10px]">{script.model.stageName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{script.model.stageName}</span>
                        </div>
                        {script.totalPrice > 0 && <span className="font-medium">{script.totalPrice}$</span>}
                        <span>{format(new Date(script.createdAt), "d MMM yyyy", { locale: fr })}</span>
                      </div>
                      {script.totalMedias > 0 && (
                        <div className="flex items-center gap-3 max-w-xs">
                          <Progress value={mediaPercent} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{script.completedMedias}/{script.totalMedias} médias</span>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={duplicating === script.id} onClick={(e) => handleDuplicate(e, script.id)}>
                      {duplicating === script.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Model overview table */}
      {modelStats.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Vue d&apos;ensemble par modèle</h2>
          <div className="rounded-lg border">
            {/* Header */}
            <div className="grid grid-cols-7 gap-2 px-4 py-2.5 border-b text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <span className="col-span-2">Modèle</span>
              <span>Scripts</span>
              <span>Prêts</span>
              <span>En prod</span>
              <span>Médias</span>
              <span>Revenus</span>
            </div>
            {/* Rows */}
            {modelStats.map((ms) => {
              const mediaPct = ms.totalMedias > 0 ? Math.round((ms.completedMedias / ms.totalMedias) * 100) : 0;
              const isActive = filterModel === ms.model.id;
              return (
                <button
                  key={ms.model.id}
                  onClick={() => setFilterModel(isActive ? "" : ms.model.id)}
                  className={cn(
                    "grid grid-cols-7 gap-2 px-4 py-3 border-b last:border-b-0 w-full text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900",
                    isActive && "bg-gray-50 dark:bg-gray-900"
                  )}
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={ms.model.photoUrl || undefined} />
                      <AvatarFallback className="text-[10px]">{ms.model.stageName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{ms.model.stageName}</span>
                    {isActive && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm self-center">{ms.total}</span>
                  <span className={cn("text-sm self-center", ms.ready > 0 && "text-green-600 font-medium")}>{ms.ready}</span>
                  <span className={cn("text-sm self-center", ms.inProd > 0 && "text-blue-600 font-medium")}>{ms.inProd}</span>
                  <div className="flex items-center gap-2 self-center">
                    <span className="text-sm">{ms.completedMedias}/{ms.totalMedias}</span>
                    {ms.totalMedias > 0 && (
                      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${mediaPct}%` }} />
                      </div>
                    )}
                  </div>
                  <span className={cn("text-sm self-center", ms.revenue > 0 && "font-medium")}>
                    {ms.revenue > 0 ? `$${ms.revenue}` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
