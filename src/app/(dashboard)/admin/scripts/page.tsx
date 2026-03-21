"use client";

import { useEffect, useState, useCallback } from "react";
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
  targetPrice?: number;
  status: "DRAFT" | "VALIDATED";
  tags: string[];
  model: {
    id: string;
    stageName: string;
    photoUrl?: string | null;
  };
  _count: {
    steps: number;
    contentTasks: number;
  };
  completedContentTasks: number;
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

export default function AdminScriptsPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<ScriptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [filterModel, setFilterModel] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterModel) params.set("modelId", filterModel);
      if (filterCategory) params.set("category", filterCategory);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/scripts?${params}`);
      const json = await res.json();
      if (json.success) {
        setScripts(json.data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [filterModel, filterCategory, filterStatus]);

  const fetchModels = useCallback(async () => {
    const res = await fetch("/api/models?limit=100");
    const json = await res.json();
    if (json.success) {
      setModels(
        json.data.models.map((m: ModelOption) => ({
          id: m.id,
          stageName: m.stageName,
          photoUrl: m.photoUrl,
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    const timeout = setTimeout(fetchScripts, 300);
    return () => clearTimeout(timeout);
  }, [fetchScripts]);

  const totalScripts = scripts.length;
  const validated = scripts.filter((s) => s.status === "VALIDATED").length;
  const drafts = scripts.filter((s) => s.status === "DRAFT").length;
  const pendingContent = scripts.reduce((acc, s) => {
    const total = s._count.contentTasks;
    const done = s.completedContentTasks;
    return acc + (total - done);
  }, 0);

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

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Total scripts
              </span>
            </div>
            <p className="text-2xl font-bold">{totalScripts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Validés
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600">{validated}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileEdit className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Brouillons
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-500">{drafts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Contenus en attente
              </span>
            </div>
            <p className="text-2xl font-bold text-orange-500">{pendingContent}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filterModel || "all"}
          onValueChange={(v) => setFilterModel(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les modèles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modèles</SelectItem>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.stageName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterCategory || "all"}
          onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus || "all"}
          onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
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
          <p className="mb-4 text-sm text-muted-foreground">
            Créez votre premier script de vente
          </p>
          <Button onClick={() => router.push("/admin/scripts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau script
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {scripts.map((script) => {
            const contentTotal = script._count.contentTasks;
            const contentDone = script.completedContentTasks;
            const contentPercent =
              contentTotal > 0
                ? Math.round((contentDone / contentTotal) * 100)
                : 0;

            return (
              <Card
                key={script.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  script.status === "DRAFT"
                    ? "border-l-4 border-l-gray-400"
                    : "border-l-4 border-l-green-500"
                )}
                onClick={() => router.push(`/admin/scripts/${script.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-base">{script.name}</h3>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            CATEGORY_COLORS[script.category]
                          )}
                        >
                          {CATEGORY_LABELS[script.category] || script.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            script.status === "VALIDATED"
                              ? "border-green-500 text-green-600"
                              : "border-gray-400 text-gray-500"
                          )}
                        >
                          {script.status === "VALIDATED" ? "Validé" : "Brouillon"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={script.model.photoUrl || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {script.model.stageName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{script.model.stageName}</span>
                        </div>

                        {script.targetPrice !== undefined && script.targetPrice !== null && (
                          <span className="font-medium">{script.targetPrice}$</span>
                        )}

                        <span>
                          {format(new Date(script.createdAt), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </span>
                      </div>

                      {contentTotal > 0 && (
                        <div className="flex items-center gap-3 max-w-xs">
                          <Progress value={contentPercent} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {contentDone}/{contentTotal} contenus
                          </span>
                        </div>
                      )}
                    </div>
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
