"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type { CustomFilters, ModelOption } from "@/types/custom.types";

interface CustomFiltersBarProps {
  filters: CustomFilters;
  onFiltersChange: (filters: CustomFilters) => void;
  models?: ModelOption[];
  showModelFilter?: boolean;
}

export function CustomFiltersBar({
  filters,
  onFiltersChange,
  models = [],
  showModelFilter = true,
}: CustomFiltersBarProps) {
  function updateFilter(key: keyof CustomFilters, value: string) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={filters.search || ""}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-10"
        />
      </div>

      <Select
        value={filters.status || "all"}
        onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="NOT_STARTED">Non commencé</SelectItem>
          <SelectItem value="IN_PROGRESS">En cours</SelectItem>
          <SelectItem value="COMPLETED">Terminé</SelectItem>
        </SelectContent>
      </Select>

      {showModelFilter && models.length > 0 && (
        <Select
          value={filters.modelId || "all"}
          onValueChange={(v) => updateFilter("modelId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Modèle" />
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
      )}

      <Select
        value={filters.contentType || "all"}
        onValueChange={(v) => updateFilter("contentType", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          <SelectItem value="PHOTO">Photo</SelectItem>
          <SelectItem value="VIDEO">Vidéo</SelectItem>
          <SelectItem value="AUDIO">Audio</SelectItem>
          <SelectItem value="COMBO">Combo</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.clientCategory || "all"}
        onValueChange={(v) =>
          updateFilter("clientCategory", v === "all" ? "" : v)
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="whale">Whale</SelectItem>
          <SelectItem value="spender">Spender</SelectItem>
          <SelectItem value="regular">Regular</SelectItem>
          <SelectItem value="new">New</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
