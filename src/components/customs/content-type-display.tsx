"use client";

import { ContentType } from "@prisma/client";
import { Camera, Video, Mic, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const typeConfig: Record<ContentType, { label: string; icon: typeof Camera }> = {
  PHOTO: { label: "Photo", icon: Camera },
  VIDEO: { label: "Vidéo", icon: Video },
  AUDIO: { label: "Audio", icon: Mic },
  COMBO: { label: "Combo", icon: Layers },
};

export function ContentTypeDisplay({ types }: { types: ContentType[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((type) => {
        const config = typeConfig[type];
        const Icon = config.icon;
        return (
          <Badge key={type} variant="outline" className="gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      })}
    </div>
  );
}
