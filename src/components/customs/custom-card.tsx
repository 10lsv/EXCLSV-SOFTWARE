"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "./status-badge";
import { ClientCategoryBadge } from "./client-category-badge";
import { ContentTypeDisplay } from "./content-type-display";
import { MessageSquare, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { CustomListItem } from "@/types/custom.types";

interface CustomCardProps {
  custom: CustomListItem;
  onClick: () => void;
  showModel?: boolean;
}

export function CustomCard({ custom, onClick, showModel = true }: CustomCardProps) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {showModel && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={custom.model.photoUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {custom.model.stageName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {custom.model.stageName}
                </span>
              </div>
            )}

            <p className="text-sm line-clamp-2">{custom.description}</p>

            <ContentTypeDisplay types={custom.contentType} />

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={custom.status} />
              <ClientCategoryBadge category={custom.clientCategory} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1 text-sm font-semibold">
              <DollarSign className="h-3.5 w-3.5" />
              {custom.totalPrice.toFixed(0)}$
            </div>
            {custom.amountCollected > 0 && (
              <span className="text-xs text-muted-foreground">
                {custom.amountCollected.toFixed(0)}$ collecté
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {custom._count.messages}
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(custom.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
