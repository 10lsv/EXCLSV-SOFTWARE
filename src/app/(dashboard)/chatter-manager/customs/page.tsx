"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CustomFiltersBar } from "@/components/customs/custom-filters";
import { CustomCard } from "@/components/customs/custom-card";
import { FileText } from "lucide-react";
import type { CustomListItem, CustomFilters, ModelOption } from "@/types/custom.types";

export default function ChatterManagerCustomsPage() {
  const router = useRouter();
  const [customs, setCustoms] = useState<CustomListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomFilters>({});
  const [models, setModels] = useState<ModelOption[]>([]);

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
      // Extract unique models for filter
      const uniqueModels = new Map<string, ModelOption>();
      json.data.customs.forEach((c: CustomListItem) => {
        if (!uniqueModels.has(c.model.id)) {
          uniqueModels.set(c.model.id, {
            id: c.model.id,
            stageName: c.model.stageName,
          });
        }
      });
      if (models.length === 0) setModels(Array.from(uniqueModels.values()));
    }
    setLoading(false);
  }, [filters, models.length]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustoms, 300);
    return () => clearTimeout(timeout);
  }, [fetchCustoms]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customs</h1>
        <p className="text-sm text-muted-foreground">
          {total} custom{total !== 1 ? "s" : ""} au total
        </p>
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
        </div>
      ) : (
        <div className="grid gap-3">
          {customs.map((custom) => (
            <CustomCard
              key={custom.id}
              custom={custom}
              onClick={() =>
                router.push(`/chatter-manager/customs/${custom.id}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
