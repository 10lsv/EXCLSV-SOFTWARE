"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  FileText,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  CheckCircle,
  Info,
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
      bg: "bg-violet-50/40 dark:bg-violet-950/15",
      icon: "text-violet-500",
      dot: "bg-violet-500",
    };
  }
  if (type.includes("COMPLETED") || type.includes("STATUS")) {
    return {
      border: "border-l-emerald-500",
      bg: "bg-emerald-50/40 dark:bg-emerald-950/15",
      icon: "text-emerald-500",
      dot: "bg-emerald-500",
    };
  }
  if (type.includes("INVOICE")) {
    return {
      border: "border-l-amber-500",
      bg: "bg-amber-50/40 dark:bg-amber-950/15",
      icon: "text-amber-500",
      dot: "bg-amber-500",
    };
  }
  if (type.includes("CUSTOM")) {
    return {
      border: "border-l-blue-500",
      bg: "bg-blue-50/40 dark:bg-blue-950/15",
      icon: "text-blue-500",
      dot: "bg-blue-500",
    };
  }
  return {
    border: "border-l-gray-400",
    bg: "bg-gray-50/40 dark:bg-gray-950/15",
    icon: "text-gray-400",
    dot: "bg-gray-400",
  };
}

interface NotificationBellProps {
  notificationsPath: string;
}

export function NotificationBell({ notificationsPath }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?source=popover");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications);
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      // Silently ignore fetch/parse errors
    }
  }, []);

  // Lightweight count polling every 10s (only when tab is visible)
  const pollCount = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/notifications?countOnly=true");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setUnreadCount(json.data.count);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(pollCount, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollCount]);

  async function handleClick(notif: Notification) {
    if (!notif.isRead) {
      await fetch(`/api/notifications/${notif.id}/read`, { method: "PATCH" });
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }
    setOpen(false);
    if (notif.link) router.push(notif.link);
  }

  async function handleDismiss(e: React.MouseEvent, notifId: string) {
    e.stopPropagation();
    await fetch(`/api/notifications/${notifId}/dismiss`, { method: "PATCH" });
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) fetchNotifications(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Separator />

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-muted-foreground">
              Vous êtes à jour !
            </p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.map((notif) => {
              const Icon = getNotifIcon(notif.type);
              const colors = getNotifColor(notif.type);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 border-l-4",
                    colors.border,
                    colors.bg
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon className={cn("h-4 w-4", colors.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {notif.title}
                      </p>
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", colors.dot)} />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {notif.message}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(notif.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <div
                    className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDismiss(e, notif.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
              router.push(notificationsPath);
            }}
          >
            Voir toutes les notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
