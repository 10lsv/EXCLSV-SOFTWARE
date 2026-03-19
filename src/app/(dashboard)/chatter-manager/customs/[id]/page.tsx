"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CustomDetailView } from "@/components/customs/custom-detail";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CustomStatus } from "@prisma/client";
import type { CustomDetail } from "@/types/custom.types";

export default function ChatterManagerCustomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [custom, setCustom] = useState<CustomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  const fetchCustom = useCallback(async () => {
    const res = await fetch(`/api/customs/${params.id}`);
    const json = await res.json();
    if (json.success) setCustom(json.data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchCustom();
    fetch("/api/auth/session").then((r) => r.json()).then((s) => {
      if (s?.user?.id) setUserId(s.user.id);
    });
  }, [fetchCustom]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!custom) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Custom introuvable.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.push("/chatter-manager/customs")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux customs
      </Button>

      <CustomDetailView
        custom={custom}
        currentUserId={userId}
        permissions={{
          canEdit: false,
          canDelete: false,
          canChangeStatus: false,
          canEditDriveLink: false,
          canSendMessage: false,
        }}
        onStatusChange={async () => {}}
        onDriveLinkChange={async () => {}}
        onSendMessage={async () => {}}
      />
    </div>
  );
}
