"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Camera,
  Bell,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CustomItem {
  id: string;
  description: string;
  status: string;
  contentType: string[];
  totalPrice: number;
  createdAt: string;
  model: { id: string; stageName: string };
}

interface ContentTask {
  id: string;
  targetQuantity: number;
  completedQuantity: number;
}

export default function ModelDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [pendingCustoms, setPendingCustoms] = useState(0);
  const [recentCustoms, setRecentCustoms] = useState<CustomItem[]>([]);
  const [contentProgress, setContentProgress] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        // Fetch session for name
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        if (session?.user?.name) {
          setUserName(session.user.name.split(" ")[0]);
        }

        // Fetch customs
        const customsRes = await fetch("/api/customs?limit=50");
        const customsJson = await customsRes.json();
        if (customsJson.success) {
          const customs: CustomItem[] = customsJson.data.customs;
          const pending = customs.filter(
            (c) => c.status === "NOT_STARTED" || c.status === "IN_PROGRESS"
          );
          setPendingCustoms(pending.length);
          setRecentCustoms(pending.slice(0, 3));
        }

        // Fetch content tasks
        const contentRes = await fetch("/api/content/tasks/my");
        const contentJson = await contentRes.json();
        if (contentJson.success) {
          const tasks: ContentTask[] = contentJson.data.tasks;
          if (tasks.length > 0) {
            const totalTarget = tasks.reduce((s, t) => s + t.targetQuantity, 0);
            const totalDone = tasks.reduce((s, t) => s + t.completedQuantity, 0);
            setContentProgress(totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0);
          }
        }

        // Fetch notification count
        const notifRes = await fetch("/api/notifications?countOnly=true");
        const notifJson = await notifRes.json();
        if (notifJson.success) {
          setUnreadNotifs(notifJson.data.count);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }

    fetchAll();
  }, []);

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  const statusLabel: Record<string, string> = {
    NOT_STARTED: "À faire",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminé",
  };

  const statusVariant: Record<string, "destructive" | "default" | "secondary"> = {
    NOT_STARTED: "destructive",
    IN_PROGRESS: "default",
    COMPLETED: "secondary",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour {userName || "!"} !
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Customs */}
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => router.push("/model/customs")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCustoms}</div>
            <p className="text-xs text-muted-foreground">
              {pendingCustoms === 0 ? "Aucun custom en attente" : "à réaliser"}
            </p>
          </CardContent>
        </Card>

        {/* Content */}
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => router.push("/model/content")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Contenu de la semaine
            </CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contentProgress}%</div>
            <Progress value={contentProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => router.push("/model/notifications")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadNotifs}</div>
            <p className="text-xs text-muted-foreground">
              {unreadNotifs === 0 ? "Tout est lu" : "non lue" + (unreadNotifs > 1 ? "s" : "")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent customs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Customs en cours</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => router.push("/model/customs")}
          >
            Voir tout
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {recentCustoms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucun custom en attente
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentCustoms.map((custom) => (
              <Card
                key={custom.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => router.push(`/model/customs/${custom.id}`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {custom.status === "IN_PROGRESS" ? (
                      <Clock className="h-5 w-5 text-amber-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {custom.description.length > 60
                        ? custom.description.substring(0, 60) + "..."
                        : custom.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={statusVariant[custom.status]}>
                        {statusLabel[custom.status] || custom.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {custom.contentType.join(", ")}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    ${custom.totalPrice}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
