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
  Trash2,
  X,
  Eye,
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

export function NotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (filter === "unread") params.set("unread", "true");

    const res = await fetch(`/api/notifications?${params}`);
    const json = await res.json();
    if (json.success) {
      setNotifications(json.data.notifications);
      setTotal(json.data.total);
      setUnreadCount(json.data.unreadCount);
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function handleDeleteAll() {
    if (!confirm("Supprimer toutes les notifications ? Cette action est irréversible.")) return;
    await fetch("/api/notifications/delete-all", { method: "DELETE" });
    setNotifications([]);
    setTotal(0);
    setUnreadCount(0);
  }

  async function handleDelete(e: React.MouseEvent, notifId: string) {
    e.stopPropagation();
    const notif = notifications.find((n) => n.id === notifId);
    await fetch(`/api/notifications/${notifId}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    setTotal((t) => t - 1);
    if (notif && !notif.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  async function handleMarkRead(e: React.MouseEvent, notifId: string) {
    e.stopPropagation();
    await fetch(`/api/notifications/${notifId}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleClick(notif: Notification) {
    if (!notif.isRead) {
      await fetch(`/api/notifications/${notif.id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notif.link) router.push(notif.link);
  }

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
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDeleteAll} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Tout supprimer
            </Button>
          )}
        </div>
      </div>

      <Select
        value={filter}
        onValueChange={(v) => {
          setFilter(v as "all" | "unread");
          setPage(1);
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="unread">Non lues</SelectItem>
        </SelectContent>
      </Select>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Aucune notification</h3>
          <p className="text-sm text-muted-foreground">
            {filter === "unread"
              ? "Toutes vos notifications sont lues"
              : "Vous n'avez aucune notification"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = getNotifIcon(notif.type);
            return (
              <Card
                key={notif.id}
                className={cn(
                  "group cursor-pointer transition-colors hover:bg-muted/50",
                  !notif.isRead && "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10"
                )}
                onClick={() => handleClick(notif)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="mt-0.5 shrink-0">
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        !notif.isRead
                          ? "text-blue-500"
                          : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          !notif.isRead ? "font-semibold" : "font-medium"
                        )}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
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
                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleMarkRead(e, notif.id)}
                        className="rounded p-1 hover:bg-muted"
                        title="Marquer comme lue"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-blue-500" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="rounded p-1 hover:bg-muted"
                      title="Supprimer"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
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
