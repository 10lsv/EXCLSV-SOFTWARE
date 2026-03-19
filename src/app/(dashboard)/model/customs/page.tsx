"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CustomCard } from "@/components/customs/custom-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Circle, Loader, CheckCircle2 } from "lucide-react";
import { startOfWeek, endOfWeek, format, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import type { CustomListItem } from "@/types/custom.types";
import { CustomStatus } from "@prisma/client";

export default function ModelCustomsPage() {
  const router = useRouter();
  const [allCustoms, setAllCustoms] = useState<CustomListItem[]>([]);
  const [customs, setCustoms] = useState<CustomListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CustomStatus | "">("");
  const [sortBy, setSortBy] = useState<string>("oldest");

  // Fetch ALL customs once for weekly stats
  const fetchAllCustoms = useCallback(async () => {
    const res = await fetch("/api/customs?limit=200");
    const json = await res.json();
    if (json.success) setAllCustoms(json.data.customs);
  }, []);

  const fetchCustoms = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/customs?${params}`);
    const json = await res.json();
    if (json.success) {
      setCustoms(json.data.customs);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchAllCustoms();
  }, [fetchAllCustoms]);

  useEffect(() => {
    fetchCustoms();
  }, [fetchCustoms]);

  // Weekly analytics
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weeklyStats = useMemo(() => {
    const thisWeek = allCustoms.filter((c) =>
      isAfter(new Date(c.createdAt), weekStart)
    );
    return {
      notStarted: thisWeek.filter((c) => c.status === "NOT_STARTED").length,
      inProgress: thisWeek.filter((c) => c.status === "IN_PROGRESS").length,
      completed: thisWeek.filter((c) => c.status === "COMPLETED").length,
      total: thisWeek.length,
    };
  }, [allCustoms, weekStart]);

  const weekLabel = `Semaine du ${format(weekStart, "d MMM", { locale: fr })} au ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;

  const sortedCustoms = useMemo(() => {
    const sorted = [...customs];
    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "price_desc":
        sorted.sort((a, b) => b.totalPrice - a.totalPrice);
        break;
      case "price_asc":
        sorted.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
    }
    return sorted;
  }, [customs, sortBy]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Mes Customs</h1>
        <p className="text-sm text-muted-foreground">
          {total} custom{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Weekly Analytics */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{weekLabel}</p>
        <div className="grid grid-cols-3 gap-3">
          {/* Not Started */}
          <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20">
            <CardContent className="flex items-center gap-3 p-3">
              <Circle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {weeklyStats.notStarted}
                </p>
                <p className="text-[11px] leading-tight text-red-600/80 dark:text-red-400/70">
                  Non commencé
                </p>
              </div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-3 p-3">
              <Loader className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {weeklyStats.inProgress}
                </p>
                <p className="text-[11px] leading-tight text-amber-600/80 dark:text-amber-400/70">
                  En cours
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="flex items-center gap-3 p-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {weeklyStats.completed}
                </p>
                <p className="text-[11px] leading-tight text-green-600/80 dark:text-green-400/70">
                  Terminé
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) =>
            setStatusFilter(v === "all" ? "" : (v as CustomStatus))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="NOT_STARTED">Non commencé</SelectItem>
            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
            <SelectItem value="COMPLETED">Terminé</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="oldest">Plus ancien d&apos;abord</SelectItem>
            <SelectItem value="newest">Plus récent d&apos;abord</SelectItem>
            <SelectItem value="price_desc">Prix décroissant</SelectItem>
            <SelectItem value="price_asc">Prix croissant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : sortedCustoms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-base font-medium">Aucun custom</h3>
          <p className="text-sm text-muted-foreground">
            Vos customs apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedCustoms.map((custom) => (
            <CustomCard
              key={custom.id}
              custom={custom}
              onClick={() => router.push(`/model/customs/${custom.id}`)}
              showModel={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
