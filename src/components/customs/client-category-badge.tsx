"use client";

import { Badge } from "@/components/ui/badge";

const categoryConfig: Record<string, { label: string; className: string }> = {
  whale: {
    label: "Whale",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  spender: {
    label: "Spender",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  regular: {
    label: "Regular",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  },
  new: {
    label: "New",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
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
