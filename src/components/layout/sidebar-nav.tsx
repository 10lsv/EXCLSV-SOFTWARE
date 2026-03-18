"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ],
  CHATTER_MANAGER: [
    { label: "Tableau de bord", href: "/chatter-manager/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/chatter-manager/customs", icon: FileText },
    { label: "Planning", href: "/chatter-manager/planning", icon: Calendar },
  ],
  CHATTER: [
    { label: "Tableau de bord", href: "/chatter/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/chatter/customs", icon: MessageSquare },
    { label: "Planning", href: "/chatter/planning", icon: Clock },
  ],
  MODEL: [
    { label: "Tableau de bord", href: "/model/dashboard", icon: LayoutDashboard },
    { label: "Customs", href: "/model/customs", icon: FileText },
    { label: "Contenu", href: "/model/content", icon: Film },
    { label: "Factures", href: "/model/invoices", icon: Receipt },
  ],
};

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navByRole[role] || [];

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
