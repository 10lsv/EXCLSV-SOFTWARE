"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  FileEdit,
  Copy,
  X,
  Camera,
  Video,
  Mic,
  MessageSquare,
  Unlock,
  Lock,
  Clock,
  StickyNote,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ——— Constants ———

const CATEGORY_COLORS: Record<string, string> = {
  UPSELL: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  SEXTING: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  RETENTION: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  FIRST_MESSAGE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  MASS_DM: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  CUSTOM_PROMO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
};

const CATEGORY_LABELS: Record<string, string> = {
  UPSELL: "Upsell",
  SEXTING: "Sexting",
  RETENTION: "Rétention",
  FIRST_MESSAGE: "Premier message",
  MASS_DM: "Mass DM",
  CUSTOM_PROMO: "Promo custom",
};

const ELEMENT_TYPES = [
  { value: "MESSAGE", label: "Message", icon: MessageSquare },
  { value: "FREE_CONTENT", label: "Contenu gratuit", icon: Unlock },
  { value: "PAID_CONTENT", label: "PPV", icon: Lock },
  { value: "WAIT", label: "Attente", icon: Clock },
  { value: "NOTE", label: "Note", icon: StickyNote },
] as const;

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  MESSAGE: "Message",
  FREE_CONTENT: "Contenu gratuit",
  PAID_CONTENT: "PPV",
  WAIT: "Attente",
  NOTE: "Note",
};

const MEDIA_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  IN_PROGRESS: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const MEDIA_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
};

const MEDIA_TYPE_ICONS: Record<string, typeof Camera> = {
  PHOTO: Camera,
  VIDEO: Video,
  AUDIO: Mic,
};

// ——— Interfaces ———

interface ScriptMedia {
  id: string;
  mediaType: string;
  description: string;
  outfit?: string;
  duration?: string;
  status: string;
  driveLink?: string;
  order: number;
}

interface ScriptElement {
  id: string;
  type: string;
  order: number;
  messageText?: string;
  waitDescription?: string;
  noteText?: string;
  price?: number;
  medias: ScriptMedia[];
}

interface ScriptStep {
  id: string;
  title: string;
  order: number;
  elements: ScriptElement[];
}

interface ScriptDetail {
  id: string;
  name: string;
  category: string;
  description?: string;
  status: "DRAFT" | "VALIDATED";
  tags: string[];
  model: {
    id: string;
    stageName: string;
    photoUrl?: string | null;
  };
  steps: ScriptStep[];
}

// ——— Helpers ———

function getElementClasses(type: string): string {
  switch (type) {
    case "MESSAGE":
      return "border-l-[3px] border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20";
    case "FREE_CONTENT":
      return "border-l-[3px] border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20";
    case "PAID_CONTENT":
      return "border-l-[3px] border-l-gray-900 bg-gray-50 dark:border-l-gray-100 dark:bg-gray-900/30";
    case "WAIT":
      return "border-l-[3px] border-l-orange-400 bg-orange-50/50 dark:bg-orange-950/20";
    case "NOTE":
      return "border-l-[3px] border-l-dashed border-l-gray-300 bg-muted/50";
    default:
      return "";
  }
}

function computeTotalPrice(steps: ScriptStep[]): number {
  let total = 0;
  for (const step of steps) {
    for (const el of step.elements) {
      if (el.type === "PAID_CONTENT" && el.price) {
        total += el.price;
      }
    }
  }
  return total;
}

function computeMediaCounts(steps: ScriptStep[]): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const step of steps) {
    for (const el of step.elements) {
      for (const media of el.medias) {
        total++;
        if (media.status === "COMPLETED") completed++;
      }
    }
  }
  return { total, completed };
}

// ——— Component ———

export default function AdminScriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Inline edit for script name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Add step dialog
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepElementType, setNewStepElementType] = useState("MESSAGE");
  const [stepCreating, setStepCreating] = useState(false);

  // Add element dropdown
  const [addElementStepId, setAddElementStepId] = useState<string | null>(null);

  // Add media dialog
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaElementId, setMediaElementId] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState("PHOTO");
  const [mediaDescription, setMediaDescription] = useState("");
  const [mediaOutfit, setMediaOutfit] = useState("");
  const [mediaDuration, setMediaDuration] = useState("");
  const [mediaCreating, setMediaCreating] = useState(false);

  // ——— Data fetching ———

  const fetchScript = useCallback(async () => {
    try {
      const res = await fetch(`/api/scripts/${params.id}`);
      const json = await res.json();
      if (json.success) {
        setScript(json.data);
      }
    } catch (err) {
      console.error("[Script] Erreur chargement:", err);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  // ——— Script-level mutations ———

  async function handleSaveName() {
    if (!nameValue.trim() || !script) return;
    try {
      await fetch(`/api/scripts/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      setEditingName(false);
      fetchScript();
    } catch (err) {
      console.error("[Script] Erreur sauvegarde nom:", err);
    }
  }

  async function handleStatusChange(newStatus: "DRAFT" | "VALIDATED") {
    try {
      await fetch(`/api/scripts/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchScript();
    } catch (err) {
      console.error("[Script] Erreur changement statut:", err);
    }
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/scripts/${params.id}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/admin/scripts/${json.data.id}`);
      }
    } catch (err) {
      console.error("[Script] Erreur duplication:", err);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce script ? Cette action est irréversible.")) return;
    try {
      await fetch(`/api/scripts/${params.id}`, { method: "DELETE" });
      router.push("/admin/scripts");
    } catch (err) {
      console.error("[Script] Erreur suppression:", err);
    }
  }

  // ——— Step mutations ———

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    setStepCreating(true);
    try {
      const res = await fetch(`/api/scripts/${params.id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newStepTitle.trim() || `Étape ${(script?.steps.length || 0) + 1}`,
          elements: [{ type: newStepElementType }],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStepDialogOpen(false);
        setNewStepTitle("");
        setNewStepElementType("MESSAGE");
        fetchScript();
      }
    } catch (err) {
      console.error("[Script] Erreur ajout étape:", err);
    }
    setStepCreating(false);
  }

  async function handleDeleteStep(stepId: string) {
    if (!confirm("Supprimer cette étape et tous ses éléments ?")) return;
    try {
      await fetch(`/api/scripts/steps/${stepId}`, { method: "DELETE" });
      fetchScript();
    } catch (err) {
      console.error("[Script] Erreur suppression étape:", err);
    }
  }

  async function handleSaveStepTitle(stepId: string, title: string) {
    try {
      await fetch(`/api/scripts/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      fetchScript();
    } catch (err) {
      console.error("[Script] Erreur sauvegarde titre étape:", err);
    }
  }

  // ——— Element mutations ———

  async function handleAddElement(stepId: string, type: string) {
    setAddElementStepId(null);
    try {
      await fetch(`/api/scripts/steps/${stepId}/elements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      fetchScript();
    } catch (err) {
      console.error("[Script] Erreur ajout élément:", err);
    }
  }

  async function handleDeleteElement(elementId: string) {
    if (!confirm("Supprimer cet élément ?")) return;
    try {
      await fetch(`/api/scripts/elements/${elementId}`, { method: "DELETE" });
      fetchScript();
    } catch (err) {
      console.error("[Script] Erreur suppression élément:", err);
    }
  }

  async function handleUpdateElement(
    elementId: string,
    data: Record<string, unknown>
  ) {
    try {
      await fetch(`/api/scripts/elements/${elementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      fetchScript();
    } catch (err) {
      console.error("[Script] Erreur mise à jour élément:", err);
    }
  }

  // ——— Media mutations ———

  function openMediaDialog(elementId: string) {
    setMediaElementId(elementId);
    setMediaType("PHOTO");
    setMediaDescription("");
    setMediaOutfit("");
    setMediaDuration("");
    setMediaDialogOpen(true);
  }

  async function handleAddMedia(e: React.FormEvent) {
    e.preventDefault();
    if (!mediaElementId || !mediaDescription.trim()) return;
    setMediaCreating(true);
    try {
      const res = await fetch(`/api/scripts/elements/${mediaElementId}/medias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: mediaType,
          description: mediaDescription.trim(),
          outfit: mediaOutfit.trim() || undefined,
          duration: mediaDuration.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMediaDialogOpen(false);
        fetchScript();
      }
    } catch (err) {
      console.error("[Script] Erreur ajout média:", err);
    }
    setMediaCreating(false);
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm("Supprimer ce média ?")) return;
    try {
      await fetch(`/api/scripts/medias/${mediaId}`, { method: "DELETE" });
      fetchScript();
    } catch (err) {
      console.error("[Script] Erreur suppression média:", err);
    }
  }

  // ——— Loading / error states ———

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Script introuvable.
      </div>
    );
  }

  const totalPrice = computeTotalPrice(script.steps);
  const { total: mediaTotal, completed: mediaCompleted } = computeMediaCounts(script.steps);
  const mediaPercent = mediaTotal > 0 ? Math.round((mediaCompleted / mediaTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={() => router.push("/admin/scripts")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux scripts
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          {/* Name - inline editable */}
          <div className="flex items-center gap-3 flex-wrap">
            {editingName ? (
              <Input
                autoFocus
                className="text-2xl font-bold h-auto py-1 px-2 w-[300px]"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
            ) : (
              <h1
                className="text-2xl font-bold tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => {
                  setNameValue(script.name);
                  setEditingName(true);
                }}
              >
                {script.name}
              </h1>
            )}
            <Badge
              variant="secondary"
              className={cn("text-xs", CATEGORY_COLORS[script.category])}
            >
              {CATEGORY_LABELS[script.category] || script.category}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                script.status === "VALIDATED"
                  ? "border-green-500 text-green-600"
                  : "border-gray-400 text-gray-500"
              )}
            >
              {script.status === "VALIDATED" ? "Validé" : "Brouillon"}
            </Badge>
          </div>

          {/* Model */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={script.model.photoUrl || undefined} />
              <AvatarFallback className="text-[10px]">
                {script.model.stageName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{script.model.stageName}</span>
          </div>

          {/* Total price */}
          {totalPrice > 0 && (
            <p className="text-sm font-medium">
              Prix total : {totalPrice}$
            </p>
          )}

          {/* Progress */}
          {mediaTotal > 0 && (
            <div className="flex items-center gap-3 max-w-xs">
              <Progress value={mediaPercent} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {mediaCompleted}/{mediaTotal} médias
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Dupliquer
          </Button>
          {script.status === "DRAFT" ? (
            <Button size="sm" onClick={() => handleStatusChange("VALIDATED")}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Valider
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("DRAFT")}
            >
              <FileEdit className="mr-2 h-4 w-4" />
              Repasser en brouillon
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      <Separator />

      {/* Timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Timeline</h2>

        {script.steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-3">
              Aucune étape pour le moment
            </p>
            <Button onClick={() => setStepDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une étape
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {script.steps
              .sort((a, b) => a.order - b.order)
              .map((step, stepIndex) => (
                <StepCard
                  key={step.id}
                  step={step}
                  stepIndex={stepIndex}
                  addElementStepId={addElementStepId}
                  setAddElementStepId={setAddElementStepId}
                  onDeleteStep={handleDeleteStep}
                  onSaveStepTitle={handleSaveStepTitle}
                  onAddElement={handleAddElement}
                  onDeleteElement={handleDeleteElement}
                  onUpdateElement={handleUpdateElement}
                  onOpenMediaDialog={openMediaDialog}
                  onDeleteMedia={handleDeleteMedia}
                />
              ))}
          </div>
        )}

        {/* Add step button */}
        {script.steps.length > 0 && (
          <Button variant="outline" onClick={() => setStepDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une étape
          </Button>
        )}
      </div>

      {/* ═══ Recap section ═══ */}
      <MediaRecapSection script={script} onUpdate={fetchScript} />

      {/* Add Step Dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une étape</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStep} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titre</label>
              <Input
                placeholder={`Étape ${(script?.steps.length || 0) + 1}`}
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Premier élément</label>
              <Select
                value={newStepElementType}
                onValueChange={setNewStepElementType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEMENT_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={stepCreating}>
                {stepCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Ajouter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Media Dialog */}
      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un média</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMedia} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de média</label>
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHOTO">Photo</SelectItem>
                  <SelectItem value="VIDEO">Vidéo</SelectItem>
                  <SelectItem value="AUDIO">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Décrivez le contenu à produire..."
                value={mediaDescription}
                onChange={(e) => setMediaDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tenue</label>
              <Input
                placeholder="Ex: Lingerie noire"
                value={mediaOutfit}
                onChange={(e) => setMediaOutfit(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Durée</label>
              <Input
                placeholder="Ex: 30 secondes"
                value={mediaDuration}
                onChange={(e) => setMediaDuration(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMediaDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={mediaCreating}>
                {mediaCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Ajouter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ——— StepCard sub-component ———

function StepCard({
  step,
  stepIndex,
  addElementStepId,
  setAddElementStepId,
  onDeleteStep,
  onSaveStepTitle,
  onAddElement,
  onDeleteElement,
  onUpdateElement,
  onOpenMediaDialog,
  onDeleteMedia,
}: {
  step: ScriptStep;
  stepIndex: number;
  addElementStepId: string | null;
  setAddElementStepId: (id: string | null) => void;
  onDeleteStep: (stepId: string) => void;
  onSaveStepTitle: (stepId: string, title: string) => void;
  onAddElement: (stepId: string, type: string) => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElement: (elementId: string, data: Record<string, unknown>) => void;
  onOpenMediaDialog: (elementId: string) => void;
  onDeleteMedia: (mediaId: string) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(step.title);

  function saveTitle() {
    if (titleValue.trim() && titleValue.trim() !== step.title) {
      onSaveStepTitle(step.id, titleValue.trim());
    }
    setEditingTitle(false);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Step header */}
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white text-sm font-bold dark:bg-white dark:text-black">
            {stepIndex + 1}
          </span>
          {editingTitle ? (
            <Input
              autoFocus
              className="font-semibold h-8 text-sm flex-1"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setTitleValue(step.title);
                  setEditingTitle(false);
                }
              }}
            />
          ) : (
            <span
              className="font-semibold text-sm cursor-pointer hover:text-primary/80 transition-colors flex-1"
              onClick={() => {
                setTitleValue(step.title);
                setEditingTitle(true);
              }}
            >
              {step.title}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
            onClick={() => onDeleteStep(step.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Elements */}
        <div className="space-y-2 pl-11">
          {step.elements
            .sort((a, b) => a.order - b.order)
            .map((element) => (
              <ElementCard
                key={element.id}
                element={element}
                onDelete={onDeleteElement}
                onUpdate={onUpdateElement}
                onOpenMediaDialog={onOpenMediaDialog}
                onDeleteMedia={onDeleteMedia}
              />
            ))}
        </div>

        {/* Add element */}
        <div className="pl-11 relative">
          {addElementStepId === step.id ? (
            <div className="flex flex-wrap gap-2 p-2 rounded-md border bg-background">
              {ELEMENT_TYPES.map((et) => {
                const Icon = et.icon;
                return (
                  <Button
                    key={et.value}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => onAddElement(step.id, et.value)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {et.label}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setAddElementStepId(null)}
              >
                Annuler
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setAddElementStepId(step.id)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ——— ElementCard sub-component ———

function ElementCard({
  element,
  onDelete,
  onUpdate,
  onOpenMediaDialog,
  onDeleteMedia,
}: {
  element: ScriptElement;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onOpenMediaDialog: (elementId: string) => void;
  onDeleteMedia: (mediaId: string) => void;
}) {
  const classes = getElementClasses(element.type);

  return (
    <div className={cn("rounded-md p-3 relative group", classes)}>
      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
        onClick={() => onDelete(element.id)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      {/* Element type label */}
      <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
        {ELEMENT_TYPE_LABELS[element.type] || element.type}
      </p>

      {/* Content by type */}
      {element.type === "MESSAGE" && (
        <Textarea
          className="bg-transparent border-0 p-0 resize-none text-sm min-h-[40px] focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Écrivez le message..."
          defaultValue={element.messageText || ""}
          rows={2}
          onBlur={(e) => {
            if (e.target.value !== (element.messageText || "")) {
              onUpdate(element.id, { messageText: e.target.value });
            }
          }}
        />
      )}

      {element.type === "FREE_CONTENT" && (
        <div className="space-y-2">
          {/* Media list */}
          <MediaList
            medias={element.medias}
            onDeleteMedia={onDeleteMedia}
          />
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenMediaDialog(element.id)}
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Média
          </Button>
        </div>
      )}

      {element.type === "PAID_CONTENT" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Prix :</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="h-7 w-24 text-sm"
              placeholder="0"
              defaultValue={element.price || ""}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val !== (element.price || 0)) {
                  onUpdate(element.id, { price: val });
                }
              }}
            />
            <span className="text-xs text-muted-foreground">$</span>
          </div>
          {/* Media list */}
          <MediaList
            medias={element.medias}
            onDeleteMedia={onDeleteMedia}
          />
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenMediaDialog(element.id)}
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Média
          </Button>
        </div>
      )}

      {element.type === "WAIT" && (
        <Input
          className="bg-transparent border-0 p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Ex: Attendre 5 min, attendre réponse..."
          defaultValue={element.waitDescription || ""}
          onBlur={(e) => {
            if (e.target.value !== (element.waitDescription || "")) {
              onUpdate(element.id, { waitDescription: e.target.value });
            }
          }}
        />
      )}

      {element.type === "NOTE" && (
        <Textarea
          className="bg-transparent border-0 p-0 resize-none text-sm italic min-h-[40px] focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Note interne..."
          defaultValue={element.noteText || ""}
          rows={2}
          onBlur={(e) => {
            if (e.target.value !== (element.noteText || "")) {
              onUpdate(element.id, { noteText: e.target.value });
            }
          }}
        />
      )}
    </div>
  );
}

// ——— MediaList sub-component ———

function MediaList({
  medias,
  onDeleteMedia,
}: {
  medias: ScriptMedia[];
  onDeleteMedia: (id: string) => void;
}) {
  if (medias.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {medias
        .sort((a, b) => a.order - b.order)
        .map((media) => {
          const Icon = MEDIA_TYPE_ICONS[media.mediaType] || Camera;
          return (
            <div
              key={media.id}
              className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs group/media"
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="max-w-[120px] truncate">{media.description}</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  MEDIA_STATUS_COLORS[media.status]
                )}
              >
                {MEDIA_STATUS_LABELS[media.status] || media.status}
              </Badge>
              <button
                className="opacity-0 group-hover/media:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                onClick={() => onDeleteMedia(media.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
    </div>
  );
}

// ═══ Media Recap Section ═══

interface FlatMedia {
  mediaId: string;
  stepOrder: number;
  stepTitle: string;
  elementType: string;
  mediaType: string;
  description: string;
  outfit: string | null;
  duration: string | null;
  status: string;
  driveLink: string | null;
}

function MediaRecapSection({
  script,
  onUpdate,
}: {
  script: {
    steps: Array<{
      order: number;
      title: string;
      elements: Array<{
        type: string;
        medias: Array<{
          id: string;
          mediaType: string;
          description: string;
          outfit?: string | null;
          duration?: string | null;
          status: string;
          driveLink?: string | null;
          order: number;
        }>;
      }>;
    }>;
  };
  onUpdate: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [editingLink, setEditingLink] = useState<Record<string, string>>({});

  const allMedias: FlatMedia[] = [];
  for (const step of script.steps) {
    for (const el of step.elements) {
      if (el.type !== "FREE_CONTENT" && el.type !== "PAID_CONTENT") continue;
      for (const media of el.medias) {
        allMedias.push({
          mediaId: media.id,
          stepOrder: step.order,
          stepTitle: step.title,
          elementType: el.type,
          mediaType: media.mediaType,
          description: media.description,
          outfit: media.outfit ?? null,
          duration: media.duration ?? null,
          status: media.status,
          driveLink: media.driveLink ?? null,
        });
      }
    }
  }

  const notStarted = allMedias.filter((m) => m.status === "NOT_STARTED").length;
  const inProgress = allMedias.filter((m) => m.status === "IN_PROGRESS").length;
  const completed = allMedias.filter((m) => m.status === "COMPLETED").length;
  const total = allMedias.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const filtered = statusFilter === "ALL" ? allMedias : allMedias.filter((m) => m.status === statusFilter);

  async function handleStatusChange(mediaId: string, status: string) {
    try {
      await fetch(`/api/scripts/medias/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onUpdate();
    } catch { /* ignore */ }
  }

  async function handleDriveLinkSave(mediaId: string) {
    const link = editingLink[mediaId];
    if (link === undefined) return;
    try {
      await fetch(`/api/scripts/medias/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveLink: link.trim() || null }),
      });
      setEditingLink((prev) => { const n = { ...prev }; delete n[mediaId]; return n; });
      onUpdate();
    } catch { /* ignore */ }
  }

  const ICONS: Record<string, string> = { PHOTO: "📷", VIDEO: "🎬", AUDIO: "🎤" };
  const STC: Record<string, string> = { NOT_STARTED: "text-red-600", IN_PROGRESS: "text-orange-600", COMPLETED: "text-green-600" };

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium shrink-0">Récapitulatif des contenus</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun contenu à produire — ajoutez des médias dans les étapes ci-dessus
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden flex">
              {notStarted > 0 && <div className="h-full bg-red-400" style={{ width: `${(notStarted / total) * 100}%` }} />}
              {inProgress > 0 && <div className="h-full bg-orange-400" style={{ width: `${(inProgress / total) * 100}%` }} />}
              {completed > 0 && <div className="h-full bg-green-500" style={{ width: `${(completed / total) * 100}%` }} />}
            </div>
            <span className="text-sm text-muted-foreground shrink-0">{completed}/{total} produits ({pct}%)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "ALL", label: "Tous", count: total, cls: "" },
              { key: "NOT_STARTED", label: "Non commencé", count: notStarted, cls: "text-red-600" },
              { key: "IN_PROGRESS", label: "En cours", count: inProgress, cls: "text-orange-600" },
              { key: "COMPLETED", label: "Terminé", count: completed, cls: "text-green-600" },
            ].map((f) => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", statusFilter === f.key ? "bg-foreground text-background" : "hover:bg-muted", statusFilter !== f.key && f.cls)}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <div className="rounded-lg border">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 border-b text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <span className="col-span-2">Étape</span>
              <span>Type</span>
              <span className="col-span-3">Média</span>
              <span>Tenue</span>
              <span>Durée</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-2">Lien Drive</span>
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun média avec ce filtre</p>
            ) : filtered.map((m) => (
              <div key={m.mediaId} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900 items-center">
                <span className="col-span-2 text-xs text-muted-foreground">#{m.stepOrder + 1} {m.stepTitle}</span>
                <span><Badge variant="secondary" className={cn("text-[10px]", m.elementType === "PAID_CONTENT" ? "bg-gray-900 text-white dark:bg-white dark:text-black" : "bg-emerald-100 text-emerald-700")}>{m.elementType === "PAID_CONTENT" ? "Payant" : "Gratuit"}</Badge></span>
                <span className="col-span-3 flex items-center gap-1.5 text-sm font-medium"><span>{ICONS[m.mediaType] || "📁"}</span>{m.description}</span>
                <span className="text-sm text-muted-foreground">{m.outfit || "—"}</span>
                <span className="text-sm text-muted-foreground">{m.duration || "—"}</span>
                <span className="col-span-2"><select className={cn("text-xs font-medium border rounded px-2 py-1 bg-background", STC[m.status])} value={m.status} onChange={(e) => handleStatusChange(m.mediaId, e.target.value)}><option value="NOT_STARTED">Non commencé</option><option value="IN_PROGRESS">En cours</option><option value="COMPLETED">Terminé</option></select></span>
                <span className="col-span-2 flex items-center gap-1">
                  <input className={cn("text-xs px-2 py-1 rounded w-full bg-background", m.driveLink && !(m.mediaId in editingLink) ? "border" : "border border-dashed border-gray-300")} placeholder="https://drive..." value={editingLink[m.mediaId] ?? m.driveLink ?? ""} onChange={(e) => setEditingLink((prev) => ({ ...prev, [m.mediaId]: e.target.value }))} onBlur={() => handleDriveLinkSave(m.mediaId)} onKeyDown={(e) => { if (e.key === "Enter") handleDriveLinkSave(m.mediaId); }} />
                  {m.driveLink && !(m.mediaId in editingLink) && <a href={m.driveLink} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
