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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  FileEdit,
  MessageSquare,
  Image,
  Video,
  Mic,
  Layers,
  Clock,
  StickyNote,
  Send,
  Unlock,
  Lock,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

const STEP_TYPE_LABELS: Record<string, string> = {
  message: "Message",
  free_content: "Contenu gratuit",
  paid_content: "Contenu payant",
  vocal: "Vocal",
  wait: "Attente",
  internal_note: "Note interne",
};

const STEP_TYPE_ICONS: Record<string, React.ReactNode> = {
  message: <MessageSquare className="h-4 w-4" />,
  free_content: <Unlock className="h-4 w-4" />,
  paid_content: <Lock className="h-4 w-4" />,
  vocal: <Mic className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />,
  internal_note: <StickyNote className="h-4 w-4" />,
};

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  PHOTO: <Image className="h-4 w-4" />,
  VIDEO: <Video className="h-4 w-4" />,
  AUDIO: <Mic className="h-4 w-4" />,
  COMBO: <Layers className="h-4 w-4" />,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  PHOTO: "Photo",
  VIDEO: "Vidéo",
  AUDIO: "Audio",
  COMBO: "Combo",
};

const CONTENT_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  IN_PROGRESS: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const CONTENT_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Non commencé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
};

interface ScriptStep {
  id: string;
  sortOrder: number;
  type: string;
  content: string;
  title?: string;
  notes?: string;
  price?: number;
  waitDuration?: string;
}

interface ScriptContentTask {
  id: string;
  contentType: string;
  description: string;
  duration?: string;
  outfit?: string;
  status: string;
  driveLink?: string;
}

interface ScriptDetail {
  id: string;
  name: string;
  category: string;
  description?: string;
  targetPrice?: number;
  status: "DRAFT" | "VALIDATED";
  tags: string[];
  model: {
    id: string;
    stageName: string;
    photoUrl?: string | null;
  };
  steps: ScriptStep[];
  contentTasks: ScriptContentTask[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminScriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Step dialog
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const [stepTitle, setStepTitle] = useState("");
  const [stepContent, setStepContent] = useState("");
  const [stepNotes, setStepNotes] = useState("");
  const [stepType, setStepType] = useState("message");

  // Edit step inline
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepTitle, setEditStepTitle] = useState("");
  const [editStepContent, setEditStepContent] = useState("");
  const [editStepNotes, setEditStepNotes] = useState("");
  const [editStepType, setEditStepType] = useState("message");
  const [editStepLoading, setEditStepLoading] = useState(false);

  // Content dialog
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentType, setContentType] = useState("PHOTO");
  const [contentDescription, setContentDescription] = useState("");
  const [contentOutfit, setContentOutfit] = useState("");
  const [contentDuration, setContentDuration] = useState("");

  // Infos edit
  const [editDescription, setEditDescription] = useState("");
  const [editTargetPrice, setEditTargetPrice] = useState("");
  const [infosSaving, setInfosSaving] = useState(false);

  const fetchScript = useCallback(async () => {
    const res = await fetch(`/api/scripts/${params.id}`);
    const json = await res.json();
    if (json.success) {
      setScript(json.data);
      setEditDescription(json.data.description || "");
      setEditTargetPrice(
        json.data.targetPrice !== undefined && json.data.targetPrice !== null
          ? String(json.data.targetPrice)
          : ""
      );
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  // Status change
  async function handleStatusChange(newStatus: "DRAFT" | "VALIDATED") {
    const res = await fetch(`/api/scripts/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.success) fetchScript();
  }

  // Delete script
  async function handleDelete() {
    if (!confirm("Supprimer ce script ? Cette action est irréversible.")) return;
    await fetch(`/api/scripts/${params.id}`, { method: "DELETE" });
    router.push("/admin/scripts");
  }

  // Add step
  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    if (!stepContent.trim()) return;
    setStepLoading(true);

    const res = await fetch(`/api/scripts/${params.id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: stepTitle.trim() || undefined,
        content: stepContent.trim(),
        notes: stepNotes.trim() || undefined,
        type: stepType,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setStepDialogOpen(false);
      setStepTitle("");
      setStepContent("");
      setStepNotes("");
      setStepType("message");
      fetchScript();
    }
    setStepLoading(false);
  }

  // Edit step
  function startEditStep(step: ScriptStep) {
    setEditingStepId(step.id);
    setEditStepTitle(step.title || "");
    setEditStepContent(step.content);
    setEditStepNotes(step.notes || "");
    setEditStepType(step.type);
  }

  async function handleSaveStep() {
    if (!editingStepId || !editStepContent.trim()) return;
    setEditStepLoading(true);

    const res = await fetch(`/api/scripts/${params.id}/steps/${editingStepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editStepTitle.trim() || undefined,
        content: editStepContent.trim(),
        notes: editStepNotes.trim() || undefined,
        type: editStepType,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setEditingStepId(null);
      fetchScript();
    }
    setEditStepLoading(false);
  }

  // Delete step
  async function handleDeleteStep(stepId: string) {
    if (!confirm("Supprimer cette étape ?")) return;
    const res = await fetch(`/api/scripts/${params.id}/steps/${stepId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) fetchScript();
  }

  // Add content task
  async function handleAddContent(e: React.FormEvent) {
    e.preventDefault();
    if (!contentDescription.trim()) return;
    setContentLoading(true);

    const res = await fetch(`/api/scripts/${params.id}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType,
        description: contentDescription.trim(),
        outfit: contentOutfit.trim() || undefined,
        duration: contentDuration.trim() || undefined,
      }),
    });
    const json = await res.json();
    if (json.success) {
      setContentDialogOpen(false);
      setContentType("PHOTO");
      setContentDescription("");
      setContentOutfit("");
      setContentDuration("");
      fetchScript();
    }
    setContentLoading(false);
  }

  // Delete content task
  async function handleDeleteContent(contentId: string) {
    if (!confirm("Supprimer ce contenu ?")) return;
    const res = await fetch(`/api/scripts/content/${contentId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) fetchScript();
  }

  // Save infos
  async function handleSaveInfos() {
    setInfosSaving(true);
    const res = await fetch(`/api/scripts/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: editDescription.trim() || undefined,
        targetPrice: editTargetPrice ? parseFloat(editTargetPrice) : undefined,
      }),
    });
    const json = await res.json();
    if (json.success) fetchScript();
    setInfosSaving(false);
  }

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

  const contentTotal = script.contentTasks.length;
  const contentDone = script.contentTasks.filter(
    (c) => c.status === "COMPLETED"
  ).length;
  const contentPercent =
    contentTotal > 0 ? Math.round((contentDone / contentTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={() => router.push("/admin/scripts")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux scripts
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{script.name}</h1>
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
          <p className="text-sm text-muted-foreground">
            {script.model.stageName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {script.status === "DRAFT" ? (
            <Button
              variant="default"
              onClick={() => handleStatusChange("VALIDATED")}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Valider
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("DRAFT")}
            >
              <FileEdit className="mr-2 h-4 w-4" />
              Repasser en brouillon
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="script">
        <TabsList>
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="contenus">Contenus</TabsTrigger>
          <TabsTrigger value="infos">Infos</TabsTrigger>
        </TabsList>

        {/* Tab Script (Steps) */}
        <TabsContent value="script" className="space-y-4 mt-4">
          {script.steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <Send className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-3">
                Aucune étape pour le moment
              </p>
              <Button onClick={() => setStepDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une étape
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {script.steps
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((step, index) => (
                    <Card key={step.id}>
                      <CardContent className="p-4">
                        {editingStepId === step.id ? (
                          /* Inline edit mode */
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                {index + 1}
                              </span>
                              <Select
                                value={editStepType}
                                onValueChange={setEditStepType}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="message">Message</SelectItem>
                                  <SelectItem value="free_content">Contenu gratuit</SelectItem>
                                  <SelectItem value="paid_content">Contenu payant</SelectItem>
                                  <SelectItem value="vocal">Vocal</SelectItem>
                                  <SelectItem value="wait">Attente</SelectItem>
                                  <SelectItem value="internal_note">Note interne</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              placeholder="Titre (optionnel)"
                              value={editStepTitle}
                              onChange={(e) => setEditStepTitle(e.target.value)}
                            />
                            <Textarea
                              placeholder="Contenu du message"
                              value={editStepContent}
                              onChange={(e) => setEditStepContent(e.target.value)}
                              rows={3}
                              required
                            />
                            <Textarea
                              placeholder="Notes internes (optionnel)"
                              value={editStepNotes}
                              onChange={(e) => setEditStepNotes(e.target.value)}
                              rows={2}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStepId(null)}
                              >
                                Annuler
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveStep}
                                disabled={editStepLoading}
                              >
                                {editStepLoading && (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                )}
                                Sauvegarder
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Display mode */
                          <div className="flex items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                              {index + 1}
                            </span>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                {step.title && (
                                  <span className="font-semibold">
                                    {step.title}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs gap-1">
                                  {STEP_TYPE_ICONS[step.type]}
                                  {STEP_TYPE_LABELS[step.type] || step.type}
                                </Badge>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">
                                {step.content}
                              </p>
                              {step.notes && (
                                <p className="text-sm italic text-muted-foreground">
                                  {step.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => startEditStep(step)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteStep(step.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setStepDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une étape
              </Button>
            </>
          )}
        </TabsContent>

        {/* Tab Contenus */}
        <TabsContent value="contenus" className="space-y-4 mt-4">
          {contentTotal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {contentDone}/{contentTotal} contenus produits
                </span>
                <span className="font-medium">{contentPercent}%</span>
              </div>
              <Progress value={contentPercent} className="h-2" />
            </div>
          )}

          {script.contentTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <Image className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-3">
                Aucun contenu requis pour le moment
              </p>
              <Button onClick={() => setContentDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un contenu
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {script.contentTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                              {CONTENT_TYPE_ICONS[task.contentType]}
                              {CONTENT_TYPE_LABELS[task.contentType] || task.contentType}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                CONTENT_STATUS_COLORS[task.status]
                              )}
                            >
                              {CONTENT_STATUS_LABELS[task.status] || task.status}
                            </Badge>
                          </div>
                          <p className="text-sm">{task.description}</p>
                          {task.outfit && (
                            <p className="text-xs text-muted-foreground">
                              Tenue : {task.outfit}
                            </p>
                          )}
                          {task.duration && (
                            <p className="text-xs text-muted-foreground">
                              Durée : {task.duration}
                            </p>
                          )}
                          {task.driveLink && (
                            <a
                              href={task.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Lien Drive
                            </a>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => handleDeleteContent(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setContentDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un contenu
              </Button>
            </>
          )}
        </TabsContent>

        {/* Tab Infos */}
        <TabsContent value="infos" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description du script..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prix cible ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editTargetPrice}
                  onChange={(e) => setEditTargetPrice(e.target.value)}
                  placeholder="Ex: 200"
                />
              </div>

              <Separator />

              {script.tags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {script.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Créé le</span>
                  <p className="font-medium">
                    {format(new Date(script.createdAt), "d MMMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modifié le</span>
                  <p className="font-medium">
                    {format(new Date(script.updatedAt), "d MMMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveInfos} disabled={infosSaving}>
                  {infosSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Step Dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une étape</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStep} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titre (optionnel)</label>
              <Input
                placeholder="Ex: Accroche initiale"
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Contenu <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Le texte du message ou la description..."
                value={stepContent}
                onChange={(e) => setStepContent(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                placeholder="Notes internes, conseils..."
                value={stepNotes}
                onChange={(e) => setStepNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={stepType} onValueChange={setStepType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="free_content">Contenu gratuit</SelectItem>
                  <SelectItem value="paid_content">Contenu payant</SelectItem>
                  <SelectItem value="vocal">Vocal</SelectItem>
                  <SelectItem value="wait">Attente</SelectItem>
                  <SelectItem value="internal_note">Note interne</SelectItem>
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
              <Button type="submit" disabled={stepLoading}>
                {stepLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Ajouter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Content Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un contenu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContent} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de contenu</label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHOTO">Photo</SelectItem>
                  <SelectItem value="VIDEO">Vidéo</SelectItem>
                  <SelectItem value="AUDIO">Audio</SelectItem>
                  <SelectItem value="COMBO">Combo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Décrivez le contenu à produire..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tenue (optionnel)</label>
              <Input
                placeholder="Ex: Lingerie noire"
                value={contentOutfit}
                onChange={(e) => setContentOutfit(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Durée (optionnel)</label>
              <Input
                placeholder="Ex: 30 secondes"
                value={contentDuration}
                onChange={(e) => setContentDuration(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContentDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={contentLoading}>
                {contentLoading && (
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
