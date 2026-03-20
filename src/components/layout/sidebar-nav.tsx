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
}

const navByRole: Record<Role, NavItem[]> = {
  OWNER: [
    { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Modèles", href: "/admin/models", icon: Users },
    { label: "Customs", href: "/admin/customs", icon: FileText },
    { label: "Scripts", href: "/admin/scripts", icon: ClipboardList },
    { label: "Planning", href: "/admin/planning", icon: Calendar },
    { label: "Finance", href: "/admin/finance", icon: DollarSign },
    { label: "Contenu", href: "/admin/content", icon: Film },
    { label: "Réseaux sociaux", href: "/admin/social", icon: Share2 },
    { label: "Onboarding", href: "/admin/onboarding", icon: ClipboardList },
    { label: "Paramètres", href: "/admin/settings", icon: Settings },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
  ],
  ADMIN: [
    { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Modèles", href: "/admin/models", icon: Users },
    { label: "Customs", href: "/admin/customs", icon: FileText },
    { label: "Scripts", href: "/admin/scripts", icon: ClipboardList },
    { label: "Planning", href: "/admin/planning", icon: Calendar },
    { label: "Finance", href: "/admin/finance", icon: DollarSign },
    { label: "Contenu", href: "/admin/content", icon: Film },
    { label: "Réseaux sociaux", href: "/admin/social", icon: Share2 },
    { label: "Onboarding", href: "/admin/onboarding", icon: ClipboardList },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
  ],
  CHATTER_MANAGER: [
    { label: "Tableau de bord", href: "/chatter-manager/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/chatter-manager/customs", icon: FileText },
    { label: "Planning", href: "/chatter-manager/planning", icon: Calendar },
    { label: "Notifications", href: "/chatter-manager/notifications", icon: Bell },
  ],
  CHATTER: [
    { label: "Tableau de bord", href: "/chatter/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/chatter/customs", icon: MessageSquare },
    { label: "Planning", href: "/chatter/planning", icon: Clock },
    { label: "Notifications", href: "/chatter/notifications", icon: Bell },
  ],
  MODEL: [
    { label: "Tableau de bord", href: "/model/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/model/customs", icon: FileText },
    { label: "Contenu", href: "/model/content", icon: Film },
    { label: "Factures", href: "/model/invoices", icon: Receipt },
    { label: "Mon Profil", href: "/model/profile", icon: User },
    { label: "Notifications", href: "/model/notifications", icon: Bell },
  ],
};

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navByRole[role] || [];
  const [unreadCount, setUnreadCount] = useState(0);

  const pollCount = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/notifications?countOnly=true");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setUnreadCount(json.data.count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    pollCount();
    const interval = setInterval(pollCount, 10000);
    return () => clearInterval(interval);
  }, [pollCount]);

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const isNotif = item.label === "Notifications";
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
            {isNotif && unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
