"use client";

import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationBanner() {
  console.log("[Push] PushNotificationBanner mounted");
  const { showBanner, loading, subscribe, dismiss } = usePushNotifications();
  console.log("[Push] showBanner:", showBanner);

  if (!showBanner) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-3 mb-4">
      <Bell className="h-5 w-5 text-primary shrink-0" />
      <p className="flex-1 text-sm">
        Recevez vos notifications en temps réel, même quand l&apos;app est fermée.
      </p>
      <Button
        size="sm"
        className="h-8 text-xs shrink-0"
        onClick={subscribe}
        disabled={loading}
      >
        {loading ? "..." : "Activer"}
      </Button>
      <button
        onClick={dismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
