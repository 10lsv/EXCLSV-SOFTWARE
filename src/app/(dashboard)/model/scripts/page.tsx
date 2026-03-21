"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ModelScript {
  id: string;
  name: string;
  category: string;
  description?: string;
  _count: {
    contentTasks: number;
  };
  completedContentTasks: number;
}

export default function ModelScriptsPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<ModelScript[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scripts/my");
      const json = await res.json();
      if (json.success) {
        setScripts(json.data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Mes Scripts</h1>
        <p className="text-sm text-muted-foreground">
          {scripts.length} script{scripts.length !== 1 ? "s" : ""} validé{scripts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement...
        </div>
      ) : scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-base font-medium">Aucun script</h3>
          <p className="text-sm text-muted-foreground">
            Vos scripts validés apparaîtront ici
          </p>
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
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => router.push(`/model/scripts/${script.id}`)}
              >
                <CardContent className="p-4 space-y-2">
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
                  </div>

                  {contentTotal > 0 && (
                    <div className="flex items-center gap-3 max-w-xs">
                      <Progress value={contentPercent} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {contentDone}/{contentTotal} contenus
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
