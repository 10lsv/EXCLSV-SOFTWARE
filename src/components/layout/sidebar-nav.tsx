"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  DollarSign,
  Film,
  Share2,
  ClipboardList,
  Settings,
  MessageSquare,
  Clock,
  Receipt,
  Bell,
  User,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: "notif" | "messages";
}

const navByRole: Record<Role, NavItem[]> = {
  OWNER: [
    { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Modèles", href: "/admin/models", icon: Users },
    { label: "Customs", href: "/admin/customs", icon: FileText },
    { label: "Messages", href: "/admin/messages", icon: MessageSquare, badge: "messages" },
    { label: "Scripts", href: "/admin/scripts", icon: ClipboardList },
    { label: "Planning", href: "/admin/planning", icon: Calendar },
    { label: "Finance", href: "/admin/finance", icon: DollarSign },
    { label: "Contenu", href: "/admin/content", icon: Film },
    { label: "Réseaux sociaux", href: "/admin/social", icon: Share2 },
    { label: "Onboarding", href: "/admin/onboarding", icon: ClipboardList },
    { label: "Paramètres", href: "/admin/settings", icon: Settings },
    { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: "notif" },
  ],
  ADMIN: [
    { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Modèles", href: "/admin/models", icon: Users },
    { label: "Customs", href: "/admin/customs", icon: FileText },
    { label: "Messages", href: "/admin/messages", icon: MessageSquare, badge: "messages" },
    { label: "Scripts", href: "/admin/scripts", icon: ClipboardList },
    { label: "Planning", href: "/admin/planning", icon: Calendar },
    { label: "Finance", href: "/admin/finance", icon: DollarSign },
    { label: "Contenu", href: "/admin/content", icon: Film },
    { label: "Réseaux sociaux", href: "/admin/social", icon: Share2 },
    { label: "Onboarding", href: "/admin/onboarding", icon: ClipboardList },
    { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: "notif" },
  ],
  CHATTER_MANAGER: [
    { label: "Tableau de bord", href: "/chatter-manager/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/chatter-manager/customs", icon: FileText },
    { label: "Messages", href: "/chatter-manager/messages", icon: MessageSquare, badge: "messages" },
    { label: "Planning", href: "/chatter-manager/planning", icon: Calendar },
    { label: "Notifications", href: "/chatter-manager/notifications", icon: Bell, badge: "notif" },
  ],
  CHATTER: [
    { label: "Tableau de bord", href: "/chatter/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/chatter/customs", icon: FileText },
    { label: "Messages", href: "/chatter/messages", icon: MessageSquare, badge: "messages" },
    { label: "Planning", href: "/chatter/planning", icon: Clock },
    { label: "Notifications", href: "/chatter/notifications", icon: Bell, badge: "notif" },
  ],
  MODEL: [
    { label: "Tableau de bord", href: "/model/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/model/customs", icon: FileText },
    { label: "Messages", href: "/model/messages", icon: MessageSquare, badge: "messages" },
    { label: "Contenu", href: "/model/content", icon: Film },
    { label: "Factures", href: "/model/invoices", icon: Receipt },
    { label: "Mon Profil", href: "/model/profile", icon: User },
    { label: "Notifications", href: "/model/notifications", icon: Bell, badge: "notif" },
  ],
};

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navByRole[role] || [];
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const [notifRes, msgRes] = await Promise.all([
        fetch("/api/notifications?countOnly=true"),
        fetch("/api/messages/unread-count"),
      ]);
      if (notifRes.ok) {
        const j = await notifRes.json();
        if (j.success) setNotifCount(j.data.count);
      }
      if (msgRes.ok) {
        const j = await msgRes.json();
        if (j.success) setMsgCount(j.data.count);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [poll]);

  function getBadgeCount(badge?: "notif" | "messages") {
    if (badge === "notif") return notifCount;
    if (badge === "messages") return msgCount;
    return 0;
  }

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const count = getBadgeCount(item.badge);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.badge && count > 0 && (
              <span className={cn(
                "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
                "bg-red-500"
              )}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
