"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  FileText,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  Info,
  CheckCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const typeIcons: Record<string, typeof Bell> = {
  NEW_CUSTOM: FileText,
  CUSTOM_STATUS: CheckCircle2,
  CUSTOM_MESSAGE: MessageSquare,
  INVOICE_READY: DollarSign,
  DEFAULT: Info,
};

function getNotifIcon(type: string) {
  return typeIcons[type] || typeIcons.DEFAULT;
}

function getNotifColor(type: string) {
  if (type.includes("MESSAGE")) {
    return {
      border: "border-l-violet-500",
      bg: "bg-violet-50/30 dark:bg-violet-950/10",
      icon: "text-violet-500",
      dot: "bg-violet-500",
    };
  }
  if (type.includes("COMPLETED") || type.includes("STATUS")) {
    return {
      border: "border-l-emerald-500",
      bg: "bg-emerald-50/30 dark:bg-emerald-950/10",
      icon: "text-emerald-500",
      dot: "bg-emerald-500",
    };
  }
  if (type.includes("INVOICE")) {
    return {
      border: "border-l-amber-500",
      bg: "bg-amber-50/30 dark:bg-amber-950/10",
      icon: "text-amber-500",
      dot: "bg-amber-500",
    };
  }
  if (type.includes("CUSTOM")) {
    return {
      border: "border-l-blue-500",
      bg: "bg-blue-50/30 dark:bg-blue-950/10",
      icon: "text-blue-500",
      dot: "bg-blue-500",
    };
  }
  return {
    border: "border-l-gray-400",
    bg: "bg-gray-50/30 dark:bg-gray-950/10",
    icon: "text-gray-400",
    dot: "bg-gray-400",
  };
}

type ThemeFilter = "all" | "customs" | "messages" | "invoices" | "system";

function getNotifTheme(type: string): ThemeFilter {
  if (type.includes("MESSAGE")) return "messages";
  if (type.includes("INVOICE")) return "invoices";
  if (type.includes("CUSTOM")) return "customs";
  return "system";
}

const themeOptions: { value: ThemeFilter; label: string; color: string }[] = [
  { value: "all", label: "Toutes", color: "" },
  { value: "customs", label: "Customs", color: "bg-blue-500" },
  { value: "messages", label: "Messages", color: "bg-violet-500" },
  { value: "invoices", label: "Factures", color: "bg-amber-500" },
  { value: "system", label: "Système", color: "bg-gray-400" },
];

export function NotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("source", "center");
    params.set("page", String(page));
    if (readFilter === "unread") params.set("unread", "true");

    try {
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications);
        setTotal(json.data.total);
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      // Silently ignore fetch/parse errors
    }
    setLoading(false);
  }, [page, readFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    await fetchNotifications();
  }

  // Croix X sur notif non lue → PATCH read → refetch
  async function handleMarkRead(e: React.MouseEvent, notifId: string) {
    e.stopPropagation();
    await fetch(`/api/notifications/${notifId}/read`, { method: "PATCH" });
    await fetchNotifications();
  }

  // Clic sur le corps de la notif → marquer comme lue + rediriger
  async function handleClick(notif: Notification) {
    if (!notif.isRead) {
      await fetch(`/api/notifications/${notif.id}/read`, { method: "PATCH" });
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.link) router.push(notif.link);
  }

  // Filtrer par thème côté client
  const filteredNotifications =
    themeFilter === "all"
      ? notifications
      : notifications.filter((n) => getNotifTheme(n.type) === themeFilter);

  // Séparer non lues / lues (triées par date desc)
  const unreadNotifs = filteredNotifications
    .filter((n) => !n.isRead)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const readNotifs = filteredNotifications
    .filter((n) => n.isRead)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
              : "Tout est lu"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <Select
          value={readFilter}
          onValueChange={(v) => {
            setReadFilter(v as "all" | "unread");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="unread">Non lues</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={themeFilter}
          onValueChange={(v) => {
            setThemeFilter(v as ThemeFilter);
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {themeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  {opt.color && (
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full", opt.color)}
                    />
                  )}
                  {opt.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Aucune notification</h3>
          <p className="text-sm text-muted-foreground">
            {readFilter === "unread"
              ? "Toutes vos notifications sont lues"
              : themeFilter !== "all"
                ? "Aucune notification dans cette catégorie"
                : "Aucune notification sur les 30 derniers jours"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Section non lues */}
          {unreadNotifs.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground px-1">
                {unreadNotifs.length} non lue
                {unreadNotifs.length > 1 ? "s" : ""}
              </p>
              {unreadNotifs.map((notif) => {
                const Icon = getNotifIcon(notif.type);
                const colors = getNotifColor(notif.type);
                return (
                  <Card
                    key={notif.id}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-muted/50 border-l-4",
                      colors.border,
                      colors.bg
                    )}
                    onClick={() => handleClick(notif)}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="mt-0.5 shrink-0">
                        <Icon className={cn("h-5 w-5", colors.icon)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{notif.title}</p>
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              colors.dot
                            )}
                          />
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {notif.message}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleMarkRead(e, notif.id)}
                          className="rounded p-1 hover:bg-muted"
                          title="Marquer comme lue"
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-blue-500" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}

          {/* Séparateur entre non lues et lues */}
          {unreadNotifs.length > 0 && readNotifs.length > 0 && (
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1 border-t border-muted-foreground/20" />
              <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                Notifications lues
              </span>
              <div className="flex-1 border-t border-muted-foreground/20" />
            </div>
          )}

          {/* Section lues — lecture seule, aucun bouton */}
          {readNotifs.length > 0 &&
            unreadNotifs.length === 0 &&
            readFilter !== "unread" && (
              <p className="text-xs font-medium text-muted-foreground/60 px-1">
                Notifications lues
              </p>
            )}
          {readNotifs.map((notif) => {
            const Icon = getNotifIcon(notif.type);
            const colors = getNotifColor(notif.type);
            return (
              <Card
                key={notif.id}
                className="cursor-pointer transition-colors hover:bg-muted/50 border-l-4 border-l-transparent opacity-70"
                onClick={() => handleClick(notif)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="mt-0.5 shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {notif.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(notif.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  {/* Aucun bouton — lecture seule */}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
