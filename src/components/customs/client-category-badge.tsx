"use client";

import { Badge } from "@/components/ui/badge";

const categoryConfig: Record<string, { label: string; className: string }> = {
  whale: {
    label: "Whale",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  spender: {
    label: "Spender",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  regular: {
    label: "Regular",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  },
  new: {
    label: "New",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
};

export function ClientCategoryBadge({ category }: { category: string }) {
  const config = categoryConfig[category] || {
    label: category,
    className: "",
  };
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
