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
  CalendarDays,
  DollarSign,
  Share2,
  ClipboardList,
  Settings,
  MessageSquare,
  Clock,
  Receipt,
  Bell,
  User,
  Rocket,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: "notif" | "messages";
  soon?: boolean;
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

const navByRole: Record<Role, NavCategory[]> = {
  OWNER: [
    {
      label: "Général",
      items: [
        { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Messages", href: "/admin/messages", icon: MessageSquare, badge: "messages" },
        { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: "notif" },
      ],
    },
    {
      label: "Gestion",
      items: [
        { label: "Modèles", href: "/admin/models", icon: Users },
        { label: "Onboarding", href: "/admin/onboarding", icon: Rocket },
      ],
    },
    {
      label: "Production",
      items: [
        { label: "Customs", href: "/admin/customs", icon: ClipboardList },
        { label: "Contenu semaine", href: "/admin/content", icon: CalendarDays },
        { label: "Scripts", href: "/admin/scripts", icon: FileText },
      ],
    },
    {
      label: "Opérations",
      items: [
        { label: "Planning", href: "/admin/planning", icon: Clock },
        { label: "Finance", href: "/admin/finance", icon: DollarSign },
        { label: "Réseaux sociaux", href: "/admin/social", icon: Share2, soon: true },
      ],
    },
    {
      label: "Système",
      items: [
        { label: "Paramètres", href: "/admin/settings", icon: Settings, soon: true },
      ],
    },
  ],
  ADMIN: [
    {
      label: "Général",
      items: [
        { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Messages", href: "/admin/messages", icon: MessageSquare, badge: "messages" },
        { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: "notif" },
      ],
    },
    {
      label: "Gestion",
      items: [
        { label: "Modèles", href: "/admin/models", icon: Users },
        { label: "Onboarding", href: "/admin/onboarding", icon: Rocket },
      ],
    },
    {
      label: "Production",
      items: [
        { label: "Customs", href: "/admin/customs", icon: ClipboardList },
        { label: "Contenu semaine", href: "/admin/content", icon: CalendarDays },
        { label: "Scripts", href: "/admin/scripts", icon: FileText },
      ],
    },
    {
      label: "Opérations",
      items: [
        { label: "Planning", href: "/admin/planning", icon: Clock },
        { label: "Finance", href: "/admin/finance", icon: DollarSign },
        { label: "Réseaux sociaux", href: "/admin/social", icon: Share2, soon: true },
      ],
    },
  ],
  CHATTER_MANAGER: [
    {
      label: "Général",
      items: [
        { label: "Tableau de bord", href: "/chatter-manager/dashboard", icon: LayoutDashboard },
        { label: "Messages", href: "/chatter-manager/messages", icon: MessageSquare, badge: "messages" },
        { label: "Notifications", href: "/chatter-manager/notifications", icon: Bell, badge: "notif" },
      ],
    },
    {
      label: "Production",
      items: [
        { label: "Customs", href: "/chatter-manager/customs", icon: ClipboardList },
      ],
    },
  ],
  CHATTER: [
    {
      label: "Général",
      items: [
        { label: "Tableau de bord", href: "/chatter/dashboard", icon: LayoutDashboard },
        { label: "Mon planning", href: "/chatter/planning", icon: Clock },
        { label: "Messages", href: "/chatter/messages", icon: MessageSquare, badge: "messages" },
        { label: "Notifications", href: "/chatter/notifications", icon: Bell, badge: "notif" },
      ],
    },
    {
      label: "Production",
      items: [
        { label: "Customs", href: "/chatter/customs", icon: ClipboardList },
      ],
    },
  ],
  MODEL: [
    {
      label: "Général",
      items: [
        { label: "Tableau de bord", href: "/model/dashboard", icon: LayoutDashboard },
        { label: "Messages", href: "/model/messages", icon: MessageSquare, badge: "messages" },
        { label: "Notifications", href: "/model/notifications", icon: Bell, badge: "notif" },
      ],
    },
    {
      label: "Production",
      items: [
        { label: "Customs", href: "/model/customs", icon: ClipboardList },
        { label: "Contenu semaine", href: "/model/content", icon: CalendarDays },
        { label: "Scripts", href: "/model/scripts", icon: FileText },
      ],
    },
    {
      label: "Mon espace",
      items: [
        { label: "Mon Profil", href: "/model/profile", icon: User },
        { label: "Mes factures", href: "/model/invoices", icon: Receipt },
      ],
    },
  ],
};

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const categories = navByRole[role] || [];
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
    <nav className="flex flex-col px-3 py-2">
      {categories.map((cat, catIndex) => (
        <div key={cat.label}>
          {/* Category label */}
          <p
            className={cn(
              "text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3 mb-1",
              catIndex > 0 ? "mt-5" : "mt-1"
            )}
          >
            {cat.label}
          </p>

          {/* Items */}
          <div className="flex flex-col gap-0.5">
            {cat.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const count = getBadgeCount(item.badge);

              if (item.soon) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40 cursor-default select-none"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    <span className="ml-auto text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-500">
                      bientôt
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.badge && count > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
