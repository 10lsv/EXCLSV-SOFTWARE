import { ContentType, CustomStatus } from "@prisma/client";

export interface CustomListItem {
  id: string;
  description: string;
  contentType: ContentType[];
  clientCategory: string;
  clientHandle: string | null;
  totalPrice: number;
  amountCollected: number;
  status: CustomStatus;
  driveLink: string | null;
  createdAt: string;
  model: {
    id: string;
    stageName: string;
    photoUrl: string | null;
  };
  createdBy: {
    id: string;
    user: { id: string; name: string };
  };
  _count: { messages: number };
}

export interface CustomDetail extends CustomListItem {
  duration: string | null;
  outfit: string | null;
  notes: string | null;
  updatedAt: string;
  messages: CustomMessageItem[];
}

export interface CustomMessageItem {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: {
    name: string;
    role: string;
  };
}

export interface ChatterOption {
  id: string;
  driveLink: string | null;
  user: { id: string; name: string; email: string };
}

export interface ModelOption {
  id: string;
  stageName: string;
}

export interface CustomFilters {
  search?: string;
  status?: CustomStatus | "";
  modelId?: string;
  contentType?: ContentType | "";
  clientCategory?: string;
}
