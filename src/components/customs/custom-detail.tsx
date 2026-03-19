"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./status-badge";
import { ClientCategoryBadge } from "./client-category-badge";
import { ContentTypeDisplay } from "./content-type-display";
import { CustomMiniChat } from "./custom-mini-chat";
import { ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CustomStatus } from "@prisma/client";
import type { CustomDetail as CustomDetailType } from "@/types/custom.types";

interface CustomDetailProps {
  custom: CustomDetailType;
  currentUserId: string;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canChangeStatus: boolean;
    canEditDriveLink: boolean;
    canSendMessage: boolean;
  };
  onStatusChange: (status: CustomStatus) => Promise<void>;
  onDriveLinkChange: (driveLink: string) => Promise<void>;
  onSendMessage: (content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onEdit?: () => void;
}

export function CustomDetailView({
  custom,
  currentUserId,
  permissions,
  onStatusChange,
  onDriveLinkChange,
  onSendMessage,
  onDelete,
  onEdit,
}: CustomDetailProps) {
  const [statusSaving, setStatusSaving] = useState(false);
  const [driveLinkValue, setDriveLinkValue] = useState(custom.driveLink || "");
  const [driveSaving, setDriveSaving] = useState(false);

  async function handleStatusChange(value: string) {
    setStatusSaving(true);
    await onStatusChange(value as CustomStatus);
    setStatusSaving(false);
  }

  async function handleDriveLinkSave() {
    setDriveSaving(true);
    await onDriveLinkChange(driveLinkValue);
    setDriveSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={custom.model.photoUrl || undefined} />
                  <AvatarFallback>
                    {custom.model.stageName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold">
                    {custom.model.stageName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Créé par {custom.createdBy.user.name} le{" "}
                    {format(new Date(custom.createdAt), "d MMMM yyyy à HH:mm", {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge status={custom.status} />
                <ClientCategoryBadge category={custom.clientCategory} />
                <ContentTypeDisplay types={custom.contentType} />
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-2xl font-bold">
                {custom.totalPrice.toFixed(0)}$
              </div>
              {custom.amountCollected > 0 && (
                <span className="text-sm text-muted-foreground">
                  {custom.amountCollected.toFixed(0)}$ collecté
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {custom.description}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Type de contenu</Label>
              <div className="mt-1">
                <ContentTypeDisplay types={custom.contentType} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Durée</Label>
                <p className="mt-1 text-sm">{custom.duration || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Tenue / accessoires</Label>
                <p className="mt-1 text-sm">{custom.outfit || "—"}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">@ du client</Label>
                <p className="mt-1 text-sm">{custom.clientHandle || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Catégorie client</Label>
                <div className="mt-1">
                  <ClientCategoryBadge category={custom.clientCategory} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Prix total</Label>
                <p className="mt-1 text-sm font-semibold">{custom.totalPrice.toFixed(0)}$</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Montant collecté</Label>
                <p className="mt-1 text-sm">{custom.amountCollected.toFixed(0)}$</p>
              </div>
            </div>

            {custom.notes && (
              <div>
                <Label className="text-muted-foreground">Notes</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {custom.notes}
                </p>
              </div>
            )}

            <Separator />

            {/* Drive Link */}
            <div className="space-y-2">
              <Label>Lien Google Drive</Label>
              {permissions.canEditDriveLink ? (
                <div className="flex gap-2">
                  <Input
                    value={driveLinkValue}
                    onChange={(e) => setDriveLinkValue(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDriveLinkSave}
                    disabled={driveSaving}
                  >
                    {driveSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Sauver"
                    )}
                  </Button>
                </div>
              ) : custom.driveLink ? (
                <a
                  href={custom.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Ouvrir le Drive
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun lien Drive
                </p>
              )}
            </div>

            {/* Status change */}
            {permissions.canChangeStatus && (
              <div className="space-y-2">
                <Label>Changer le statut</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={custom.status}
                    onValueChange={handleStatusChange}
                    disabled={statusSaving}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_STARTED">Non commencé</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="COMPLETED">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                  {statusSaving && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {(permissions.canEdit || permissions.canDelete) && (
              <>
                <Separator />
                <div className="flex gap-2">
                  {permissions.canEdit && onEdit && (
                    <Button variant="outline" onClick={onEdit}>
                      Modifier
                    </Button>
                  )}
                  {permissions.canDelete && onDelete && (
                    <Button variant="destructive" onClick={onDelete}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mini Chat */}
        <CustomMiniChat
          messages={custom.messages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          canSendMessage={permissions.canSendMessage}
        />
      </div>
    </div>
  );
}
