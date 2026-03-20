"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CustomFiltersBar } from "@/components/customs/custom-filters";
import { CustomCard } from "@/components/customs/custom-card";
import { CustomForm } from "@/components/customs/custom-form";
import {
  Plus,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
  CircleDot,
  Loader2,
  CircleCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CustomListItem,
  CustomFilters,
  ModelOption,
  ChatterOption,
} from "@/types/custom.types";
import type { CreateCustomInput } from "@/lib/validations/custom";

interface Stats {
  customsThisWeek: number;
  revenueThisMonth: number;
  avgProductionHours: number | null;
  completionRate: number;
  completedThisMonth: number;
  totalThisMonth: number;
  remainingToCollect: number;
}

type GroupBy = "none" | "chatter" | "model";
type SortBy = "recent" | "oldest" | "price_desc" | "price_asc";

export default function AdminCustomsPage() {
  const router = useRouter();
  const [customs, setCustoms] = useState<CustomListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomFilters>({});
  const [models, setModels] = useState<ModelOption[]>([]);
  const [chatters, setChatters] = useState<ChatterOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

  const fetchCustoms = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "200");
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.modelId) params.set("modelId", filters.modelId);
    if (filters.contentType) params.set("contentType", filters.contentType);
    if (filters.clientCategory)
      params.set("clientCategory", filters.clientCategory);

    const res = await fetch(`/api/customs?${params}`);
    const json = await res.json();
    if (json.success) {
      setCustoms(json.data.customs);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/customs/stats");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch {
      // ignore
    }
  }, []);

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

  const fetchChatters = useCallback(async () => {
    const res = await fetch("/api/chatters");
    const json = await res.json();
    if (json.success) {
      setChatters(json.data);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    fetchChatters();
    fetchStats();
  }, [fetchModels, fetchChatters, fetchStats]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustoms, 300);
    return () => clearTimeout(timeout);
  }, [fetchCustoms]);

  async function handleCreate(data: CreateCustomInput) {
    setCreateLoading(true);
    setCreateError("");
    const res = await fetch("/api/customs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) {
      setCreateError(json.error);
      setCreateLoading(false);
      return;
    }
    setCreateOpen(false);
    setCreateLoading(false);
    fetchCustoms();
    fetchStats();
  }

  // Tri : actifs (NOT_STARTED + IN_PROGRESS) selon le sélecteur, COMPLETED en bas par date
  const sortedCustoms = useMemo(() => {
    const applySort = (items: CustomListItem[]) => {
      const s = [...items];
      switch (sortBy) {
        case "oldest":
          s.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case "price_desc":
          s.sort((a, b) => b.totalPrice - a.totalPrice);
          break;
        case "price_asc":
          s.sort((a, b) => a.totalPrice - b.totalPrice);
          break;
        default:
          s.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return s;
    };

    const active = applySort(customs.filter((c) => c.status !== "COMPLETED"));
    const completed = [...customs.filter((c) => c.status === "COMPLETED")]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return [...active, ...completed];
  }, [customs, sortBy]);

  // Groupement
  const groups = useMemo(() => {
    if (groupBy === "none") return null;

    const map = new Map<
      string,
      { label: string; customs: CustomListItem[]; revenue: number }
    >();

    for (const c of sortedCustoms) {
      let key: string;
      let label: string;
      if (groupBy === "chatter") {
        key = c.createdBy.id;
        label = c.createdBy.user.name;
      } else {
        key = c.model.id;
        label = c.model.stageName;
      }

      if (!map.has(key)) {
        map.set(key, { label, customs: [], revenue: 0 });
      }
      const group = map.get(key)!;
      group.customs.push(c);
      group.revenue += c.totalPrice;
    }

    return Array.from(map.values()).sort(
      (a, b) => b.customs.length - a.customs.length
    );
  }, [sortedCustoms, groupBy]);

  function formatAvgTime(hours: number | null) {
    if (hours === null) return "—";
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}j`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customs</h1>
          <p className="text-sm text-muted-foreground">
            {total} custom{total !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau custom
        </Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Cette semaine
                </span>
              </div>
              <p className="text-2xl font-bold">{stats.customsThisWeek}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Revenus du mois
                </span>
              </div>
              <p className="text-2xl font-bold">
                {stats.revenueThisMonth.toFixed(0)}$
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Temps moyen
                </span>
              </div>
              <p className="text-2xl font-bold">
                {formatAvgTime(stats.avgProductionHours)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Complétion
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
                <span className="text-xs text-muted-foreground">
                  {stats.completedThisMonth}/{stats.totalThisMonth}
                </span>
              </div>
              <Progress value={stats.completionRate} className="mt-2 h-1.5" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  À collecter
                </span>
              </div>
              <p
                className={cn(
                  "text-2xl font-bold",
                  stats.remainingToCollect > 0
                    ? "text-red-600"
                    : "text-emerald-600"
                )}
              >
                {stats.remainingToCollect.toFixed(0)}$
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Récap par statut */}
      {customs.length > 0 && (
        <div className="grid gap-3 grid-cols-3">
          <Card
            className={cn(
              "border-l-4 border-l-red-400 cursor-pointer transition-colors hover:bg-red-50/50",
              filters.status === "NOT_STARTED" && "ring-2 ring-red-400"
            )}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                status: f.status === "NOT_STARTED" ? "" : "NOT_STARTED",
              }))
            }
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-950">
                <CircleDot className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {customs.filter((c) => c.status === "NOT_STARTED").length}
                </p>
                <p className="text-xs text-muted-foreground">Non commencé</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-l-4 border-l-amber-400 cursor-pointer transition-colors hover:bg-amber-50/50",
              filters.status === "IN_PROGRESS" && "ring-2 ring-amber-400"
            )}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                status: f.status === "IN_PROGRESS" ? "" : "IN_PROGRESS",
              }))
            }
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-950">
                <Loader2 className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {customs.filter((c) => c.status === "IN_PROGRESS").length}
                </p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-l-4 border-l-emerald-400 cursor-pointer transition-colors hover:bg-emerald-50/50",
              filters.status === "COMPLETED" && "ring-2 ring-emerald-400"
            )}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                status: f.status === "COMPLETED" ? "" : "COMPLETED",
              }))
            }
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-950">
                <CircleCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {customs.filter((c) => c.status === "COMPLETED").length}
                </p>
                <p className="text-xs text-muted-foreground">Terminé</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <CustomFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        models={models}
      />

      {/* Tri & Groupement */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortBy)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Plus récent d&apos;abord</SelectItem>
            <SelectItem value="oldest">Plus ancien d&apos;abord</SelectItem>
            <SelectItem value="price_desc">Prix décroissant</SelectItem>
            <SelectItem value="price_asc">Prix croissant</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={groupBy}
          onValueChange={(v) => setGroupBy(v as GroupBy)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun groupement</SelectItem>
            <SelectItem value="chatter">Par chatter</SelectItem>
            <SelectItem value="model">Par modèle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : customs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">
            Aucun custom pour le moment
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Créez votre premier custom content
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau custom
          </Button>
        </div>
      ) : groups ? (
        // Affichage groupé
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{group.label}</h3>
                  <span className="text-xs text-muted-foreground">
                    {group.customs.length} custom
                    {group.customs.length > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {group.revenue.toFixed(0)}$
                </span>
              </div>
              <div className="grid gap-2">
                {group.customs.map((custom) => (
                  <CustomCard
                    key={custom.id}
                    custom={custom}
                    onClick={() =>
                      router.push(`/admin/customs/${custom.id}`)
                    }
                    showModel={groupBy !== "model"}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (() => {
        // Affichage normal avec séparateur "Terminés"
        const activeCustoms = sortedCustoms.filter((c) => c.status !== "COMPLETED");
        const completedCustoms = sortedCustoms.filter((c) => c.status === "COMPLETED");

        return (
          <div className="grid gap-3">
            {activeCustoms.map((custom) => (
              <CustomCard
                key={custom.id}
                custom={custom}
                onClick={() => router.push(`/admin/customs/${custom.id}`)}
              />
            ))}

            {completedCustoms.length > 0 && activeCustoms.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground shrink-0">
                  Terminés ({completedCustoms.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            {completedCustoms.map((custom) => (
              <CustomCard
                key={custom.id}
                custom={custom}
                onClick={() => router.push(`/admin/customs/${custom.id}`)}
                dimCompleted
              />
            ))}
          </div>
        );
      })()}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau Custom</DialogTitle>
          </DialogHeader>
          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
          <CustomForm
            onSubmit={handleCreate}
            models={models}
            chatters={chatters}
            showChatterSelect
            loading={createLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
