"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface UserMenuProps {
  name: string;
  email: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  CHATTER_MANAGER: "Manager Chatters",
  CHATTER: "Chatter",
  MODEL: "Modèle",
};

export function UserMenu({ name, role }: UserMenuProps) {

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    // Get CSRF token
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    // POST signout — redirect: manual to avoid following the 302 to HTML
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `csrfToken=${csrfToken}`,
      redirect: "manual",
    });

    // Force full page navigation to clear all client state
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden min-w-0 text-left md:block">
          <p className="truncate text-sm font-medium leading-none">{name}</p>
          <p className="text-xs text-muted-foreground">
            {roleLabels[role] || role}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        title="Se déconnecter"
      >
        <LogOut className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
