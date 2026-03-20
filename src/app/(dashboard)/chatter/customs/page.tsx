"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomFiltersBar } from "@/components/customs/custom-filters";
import { CustomCard } from "@/components/customs/custom-card";
import { CustomForm } from "@/components/customs/custom-form";
import { Plus, FileText } from "lucide-react";
import type {
  CustomListItem,
  CustomFilters,
  ModelOption,
} from "@/types/custom.types";
import type { CreateCustomInput } from "@/lib/validations/custom";

export default function ChatterCustomsPage() {
  const router = useRouter();
  const [customs, setCustoms] = useState<CustomListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomFilters>({});
  const [models, setModels] = useState<ModelOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Fetch assigned models on mount
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/models?assigned=true");
      const json = await res.json();
      if (json.success) setModels(json.data.models);
    })();
  }, []);

  const fetchCustoms = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.modelId) params.set("modelId", filters.modelId);
    if (filters.contentType) params.set("contentType", filters.contentType);
    if (filters.clientCategory) params.set("clientCategory", filters.clientCategory);

    const res = await fetch(`/api/customs?${params}`);
    const json = await res.json();
    if (json.success) {
      setCustoms(json.data.customs);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [filters]);

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
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes Customs</h1>
          <p className="text-sm text-muted-foreground">
            {total} custom{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau custom
        </Button>
      </div>

      <CustomFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        models={models}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : customs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Aucun custom pour le moment</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Créez un custom pour vos modèles assignés
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau custom
          </Button>
        </div>
      ) : (() => {
        const statusOrder: Record<string, number> = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 };
        const sorted = [...customs].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
        const active = sorted.filter((c) => c.status !== "COMPLETED");
        const completed = sorted.filter((c) => c.status === "COMPLETED");

        return (
          <div className="grid gap-3">
            {active.map((custom) => (
              <CustomCard key={custom.id} custom={custom} onClick={() => router.push(`/chatter/customs/${custom.id}`)} />
            ))}
            {completed.length > 0 && active.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground shrink-0">Terminés ({completed.length})</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            {completed.map((custom) => (
              <CustomCard key={custom.id} custom={custom} onClick={() => router.push(`/chatter/customs/${custom.id}`)} dimCompleted />
            ))}
          </div>
        );
      })()}

      {/* Create Dialog — chatter does not pick chatter (auto-filled by API) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau Custom</DialogTitle>
          </DialogHeader>
          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
          <CustomForm
            defaultValues={{ createdById: "auto" }}
            onSubmit={handleCreate}
            models={models}
            showChatterSelect={false}
            loading={createLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
