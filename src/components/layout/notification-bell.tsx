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

interface NotificationBellProps {
  notificationsPath: string;
}

export function NotificationBell({ notificationsPath }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=5");
    const json = await res.json();
    if (json.success) {
      setNotifications(json.data.notifications);
      setUnreadCount(json.data.unreadCount);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleClick(notif: Notification) {
    if (!notif.isRead) {
      await fetch(`/api/notifications/${notif.id}/read`, { method: "PATCH" });
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    setOpen(false);
    if (notif.link) router.push(notif.link);
  }

  async function handleDelete(e: React.MouseEvent, notifId: string) {
    e.stopPropagation();
    const notif = notifications.find((n) => n.id === notifId);
    await fetch(`/api/notifications/${notifId}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    if (notif && !notif.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune notification
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.map((notif) => {
              const Icon = getNotifIcon(notif.type);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    !notif.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon
                      className={cn(
                        "h-4 w-4",
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
                          "text-sm truncate",
                          !notif.isRead ? "font-semibold" : "font-medium"
                        )}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
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
                    onClick={(e) => handleDelete(e, notif.id)}
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
