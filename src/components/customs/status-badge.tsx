"use client";

import { Badge } from "@/components/ui/badge";
import { CustomStatus } from "@prisma/client";

const statusConfig: Record<CustomStatus, { label: string; className: string }> = {
  NOT_STARTED: {
    label: "Non commencé",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  IN_PROGRESS: {
    label: "En cours",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  COMPLETED: {
    label: "Terminé",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
};

export function StatusBadge({ status }: { status: CustomStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
