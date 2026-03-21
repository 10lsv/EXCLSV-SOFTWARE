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
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
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

const CATEGORIES = Object.keys(CATEGORY_LABELS);

function getCardBorder(s: ScriptListItem): string {
  if (s.status === "DRAFT") return "border-l-4 border-l-gray-300 bg-gray-50/50 dark:bg-gray-900/20";
  if (s.totalMedias > 0 && s.completedMedias === s.totalMedias) return "border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/10";
  return "border-l-4 border-l-blue-500";
}

export default function AdminScriptsPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<ScriptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [filterModel, setFilterModel] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterModel) params.set("modelId", filterModel);
      if (filterCategory) params.set("category", filterCategory);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/scripts?${params}`);
      const json = await res.json();
      if (json.success) setScripts(json.data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [filterModel, filterCategory, filterStatus]);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models?limit=100");
      const json = await res.json();
      if (json.success) setModels(json.data.models.map((m: ModelOption) => ({ id: m.id, stageName: m.stageName, photoUrl: m.photoUrl })));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);
  useEffect(() => { const t = setTimeout(fetchScripts, 300); return () => clearTimeout(t); }, [fetchScripts]);

  async function handleDuplicate(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDuplicating(id);
    try {
      const res = await fetch(`/api/scripts/${id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (json.success) fetchScripts();
    } catch {
      // ignore
    }
    setDuplicating(null);
  }

  // ─── KPI calculations ───
  const kpis = useMemo(() => {
    const ready = scripts.filter(
      (s) => s.status === "VALIDATED" && s.totalMedias > 0 && s.completedMedias === s.totalMedias
    );
    const inProd = scripts.filter(
      (s) => s.status === "VALIDATED" && (s.totalMedias === 0 || s.completedMedias < s.totalMedias)
    );
    const drafts = scripts.filter((s) => s.status === "DRAFT");
    const totalMedias = scripts.reduce((a, s) => a + s.totalMedias, 0);
    const completedMedias = scripts.reduce((a, s) => a + s.completedMedias, 0);
    const prodRate = totalMedias > 0 ? Math.round((completedMedias / totalMedias) * 100) : 0;
    const readyRevenue = ready.reduce((a, s) => a + s.totalPrice, 0);

    return { total: scripts.length, ready: ready.length, inProd: inProd.length, drafts: drafts.length, prodRate, readyRevenue };
  }, [scripts]);

  // ─── Category distribution ───
  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    scripts.forEach((s) => { map[s.category] = (map[s.category] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [scripts]);

  // ─── Models en retard ───
  const lateModels = useMemo(() => {
    const now = new Date();
    const map = new Map<string, { model: ScriptListItem["model"]; pending: number; days: number }>();
    scripts
      .filter((s) => s.status === "VALIDATED" && s.totalMedias > s.completedMedias)
      .forEach((s) => {
        const age = differenceInDays(now, new Date(s.createdAt));
        if (age < 7) return;
        const pending = s.totalMedias - s.completedMedias;
        const existing = map.get(s.model.id);
        if (existing) {
          existing.pending += pending;
          existing.days = Math.max(existing.days, age);
        } else {
          map.set(s.model.id, { model: s.model, pending, days: age });
        }
      });
    return Array.from(map.values());
  }, [scripts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scripts</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos scripts de vente et conversations
          </p>
        </div>
        <Button onClick={() => router.push("/admin/scripts/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau script
        </Button>
      </div>

      {/* KPI Cards — 6 cards, 2 rows */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total scripts</span>
            </div>
            <p className="text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Prêts à l&apos;emploi</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{kpis.ready}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">En production</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{kpis.inProd}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-50/50 dark:bg-gray-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileEdit className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Brouillons</span>
            </div>
            <p className="text-2xl font-bold text-gray-500">{kpis.drafts}</p>
          </CardContent>
        </Card>

        <Card className={cn(
          kpis.prodRate >= 80 ? "border-green-200 bg-green-50/50" :
          kpis.prodRate >= 50 ? "border-orange-200 bg-orange-50/50" :
          "border-red-200 bg-red-50/50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Taux production</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              kpis.prodRate >= 80 ? "text-green-600" : kpis.prodRate >= 50 ? "text-orange-600" : "text-red-600"
            )}>
              {kpis.prodRate}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black dark:bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/70 dark:text-black/70 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Revenus potentiels</span>
            </div>
            <p className="text-2xl font-bold text-white dark:text-black">
              {kpis.readyRevenue > 0 ? `$${kpis.readyRevenue.toLocaleString()}` : "$0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category badges */}
      {catCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterCategory("")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
              !filterCategory ? "bg-foreground text-background" : "hover:bg-muted"
            )}
          >
            Tous
          </button>
          {catCounts.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                filterCategory === cat ? "ring-2 ring-offset-1 ring-primary" : "",
                CATEGORY_COLORS[cat]
              )}
            >
              {CATEGORY_LABELS[cat] || cat} ×{count}
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
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

      {/* Late models alert */}
      {lateModels.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:bg-amber-950/10 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Modèles à relancer</span>
          </div>
          <div className="space-y-1.5">
            {lateModels.map((lm) => (
              <button
                key={lm.model.id}
                onClick={() => setFilterModel(lm.model.id)}
                className="flex items-center gap-2 text-sm hover:underline w-full text-left"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={lm.model.photoUrl || undefined} />
                  <AvatarFallback className="text-[8px]">{lm.model.stageName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{lm.model.stageName}</span>
                <span className="text-muted-foreground">— {lm.pending} média{lm.pending > 1 ? "s" : ""} en attente depuis {lm.days}j</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
                        <Badge variant="outline" className={cn("text-xs",
                          script.status === "VALIDATED" ? "border-green-500 text-green-600" : "border-gray-400 text-gray-500"
                        )}>
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
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {script.completedMedias}/{script.totalMedias} médias
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={duplicating === script.id}
                      onClick={(e) => handleDuplicate(e, script.id)}
                    >
                      {duplicating === script.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
