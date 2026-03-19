"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomDetailView } from "@/components/customs/custom-detail";
import { CustomForm } from "@/components/customs/custom-form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CustomStatus } from "@prisma/client";
import type { CustomDetail } from "@/types/custom.types";
import type { CreateCustomInput } from "@/lib/validations/custom";

export default function ChatterCustomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [custom, setCustom] = useState<CustomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function handleStatusChange(status: CustomStatus) {
    const res = await fetch(`/api/customs/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if ((await res.json()).success) fetchCustom();
  }

  async function handleDriveLinkChange(driveLink: string) {
    const res = await fetch(`/api/customs/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveLink }),
    });
    if ((await res.json()).success) fetchCustom();
  }

  async function handleSendMessage(content: string) {
    const res = await fetch(`/api/customs/${params.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if ((await res.json()).success) fetchCustom();
  }

  async function handleUpdate(data: CreateCustomInput) {
    setSaving(true);
    const res = await fetch(`/api/customs/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if ((await res.json()).success) {
      setEditOpen(false);
      fetchCustom();
    }
    setSaving(false);
  }

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
      <Button variant="ghost" onClick={() => router.push("/chatter/customs")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux customs
      </Button>

      <CustomDetailView
        custom={custom}
        currentUserId={userId}
        permissions={{
          canEdit: true,
          canDelete: false,
          canChangeStatus: true,
          canEditDriveLink: true,
          canSendMessage: true,
        }}
        onStatusChange={handleStatusChange}
        onDriveLinkChange={handleDriveLinkChange}
        onSendMessage={handleSendMessage}
        onEdit={() => setEditOpen(true)}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le custom</DialogTitle>
          </DialogHeader>
          <CustomForm
            defaultValues={{
              modelId: custom.model.id,
              createdById: custom.createdBy.id,
              description: custom.description,
              contentType: custom.contentType,
              duration: custom.duration,
              outfit: custom.outfit,
              clientCategory: custom.clientCategory as CreateCustomInput["clientCategory"],
              clientHandle: custom.clientHandle,
              totalPrice: custom.totalPrice,
              amountCollected: custom.amountCollected,
              notes: custom.notes,
              driveLink: custom.driveLink,
            }}
            onSubmit={handleUpdate}
            models={[{ id: custom.model.id, stageName: custom.model.stageName }]}
            loading={saving}
            isEdit
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
