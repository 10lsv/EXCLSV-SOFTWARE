"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CalendarDays,
  Clock,
  Timer,
  BarChart3,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn, getMondayUTC } from "@/lib/utils";
import {
  SHIFTS,
  SHIFT_LABELS,
  getShiftDuration,
  type ShiftType,
} from "@/lib/shifts";
import { format, addDays, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

/* ---------- Types ---------- */

interface ChatterInfo {
  id: string;
  name: string;
  avatar?: string;
}

interface ModelInfo {
  id: string;
  stageName: string;
  photoUrl?: string;
}

interface PlanningShift {
  id: string;
  chatterId: string;
  shiftDate: string;
  shiftType: ShiftType;
  note?: string;
  chatter: ChatterInfo;
  model: ModelInfo | null;
}

interface ClockRecord {
  id: string;
  chatterId: string;
  shiftDate: string;
  shiftType: ShiftType;
  clockIn: string;
  clockOut?: string;
  source?: string;
  chatter: { id: string; name: string };
}

interface Ticket {
  id: string;
  chatterId: string;
  chatter?: ChatterInfo;
  shiftDate: string;
  shiftType: ShiftType;
  comment?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface PlanningData {
  shifts: PlanningShift[];
  clocks: ClockRecord[];
  chatters: ChatterInfo[];
  models: ModelInfo[];
  assignments: Record<string, string[]>;
  weekStart: string;
}

/* ---------- Constants ---------- */

const SHIFT_TYPES: ShiftType[] = ["SHIFT_A", "SHIFT_B", "SHIFT_C"];
const DAY_COUNT = 7;

const SHIFT_BADGE_STYLE: Record<ShiftType, string> = {
  SHIFT_A: "bg-blue-100 text-blue-700",
  SHIFT_B: "bg-violet-100 text-violet-700",
  SHIFT_C: "bg-amber-100 text-amber-700",
};

const SHIFT_BORDER: Record<ShiftType, string> = {
  SHIFT_A: "border-l-blue-500",
  SHIFT_B: "border-l-violet-500",
  SHIFT_C: "border-l-amber-500",
};

type ViewMode = "shifts" | "models";

/* ---------- Component ---------- */

export default function AdminPlanningPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<PlanningData>({
    shifts: [],
    clocks: [],
    chatters: [],
    models: [],
    assignments: {},
    weekStart: "",
  });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("shifts");

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignShiftType, setAssignShiftType] = useState<ShiftType>("SHIFT_A");
  const [assignDate, setAssignDate] = useState<string>("");
  const [assignModelId, setAssignModelId] = useState<string | null>(null);
  const [assignChatterId, setAssignChatterId] = useState("");
  const [assignCheckedModels, setAssignCheckedModels] = useState<string[]>([]);
  const [assignNote, setAssignNote] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editShift, setEditShift] = useState<PlanningShift | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  /* --- Computed dates --- */
  const monday = useMemo(() => {
    const base = getMondayUTC();
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, i) => addDays(monday, i)),
    [monday]
  );

  const today = useMemo(() => new Date(), []);

  /* --- Fetchers --- */
  const fetchPlanning = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/planning?weekStart=${monday.toISOString()}`
      );
      const json = await res.json();
      const d = json.data || json;
      setData({
        shifts: d.shifts ?? [],
        clocks: d.clocks ?? [],
        chatters: d.chatters ?? [],
        models: d.models ?? [],
        assignments: d.assignments ?? {},
        weekStart: d.weekStart ?? monday.toISOString(),
      });
    } catch {
      // erreur silencieuse
    }
    setLoading(false);
  }, [monday]);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/clock/tickets");
      const json = await res.json();
      setTickets(json.data ?? json.tickets ?? []);
    } catch {
      // erreur silencieuse
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  /* --- KPI calculations --- */
  const kpis = useMemo(() => {
    const shiftCount = data.shifts.length;
    const plannedHours = data.shifts.reduce(
      (sum, s) => sum + getShiftDuration(s.shiftType),
      0
    );
    const clockedHours = data.clocks.reduce((sum, c) => {
      if (!c.clockOut) return sum;
      const start = new Date(c.clockIn).getTime();
      const end = new Date(c.clockOut).getTime();
      return sum + (end - start) / 3_600_000;
    }, 0);

    let coverage = 0;
    if (viewMode === "shifts") {
      coverage = (shiftCount / 21) * 100;
    } else {
      // modèles: paires uniques (model x jour) avec au moins 1 shift
      const pairs = new Set<string>();
      data.shifts.forEach((s) => {
        if (s.model) {
          const dayStr = s.shiftDate.slice(0, 10);
          pairs.add(`${s.model.id}_${dayStr}`);
        }
      });
      const total = data.models.length * 7;
      coverage = total > 0 ? (pairs.size / total) * 100 : 0;
    }

    return { shiftCount, plannedHours, clockedHours, coverage };
  }, [data.shifts, data.clocks, data.models.length, viewMode]);

  /* --- Week navigation --- */
  const prevWeekMonday = useMemo(() => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - 7);
    return d;
  }, [monday]);

  async function handleDuplicateWeek() {
    setDuplicating(true);
    try {
      const res = await fetch("/api/planning/duplicate-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWeekStart: prevWeekMonday.toISOString(),
          targetWeekStart: monday.toISOString(),
        }),
      });
      if (res.ok) {
        await fetchPlanning();
      }
    } catch {
      // erreur silencieuse
    }
    setDuplicating(false);
  }

  /* --- Grid helpers --- */
  function getShiftsForCell(day: Date, shiftType: ShiftType) {
    const dayStr = format(day, "yyyy-MM-dd");
    return data.shifts.filter(
      (s) => s.shiftDate.startsWith(dayStr) && s.shiftType === shiftType
    );
  }

  function getShiftsForModelDay(modelId: string, day: Date) {
    const dayStr = format(day, "yyyy-MM-dd");
    return data.shifts.filter(
      (s) => s.shiftDate.startsWith(dayStr) && s.model?.id === modelId
    );
  }

  /* --- Group shifts by chatter for a cell --- */
  function groupByChatter(cellShifts: PlanningShift[]) {
    const map = new Map<
      string,
      { chatter: ChatterInfo; models: (ModelInfo | null)[], shifts: PlanningShift[] }
    >();
    for (const s of cellShifts) {
      const existing = map.get(s.chatterId);
      if (existing) {
        existing.models.push(s.model);
        existing.shifts.push(s);
      } else {
        map.set(s.chatterId, {
          chatter: s.chatter,
          models: [s.model],
          shifts: [s],
        });
      }
    }
    return Array.from(map.values());
  }

  /* --- Assign dialog handlers --- */
  function openAssignDialog(
    day: Date,
    shiftType: ShiftType,
    preModelId?: string
  ) {
    setAssignDate(format(day, "yyyy-MM-dd"));
    setAssignShiftType(shiftType);
    setAssignModelId(preModelId ?? null);
    setAssignChatterId("");
    setAssignCheckedModels(preModelId ? [preModelId] : []);
    setAssignNote("");
    setAssignDialogOpen(true);
  }

  // Modèles disponibles pour le chatter sélectionné
  const assignAvailableModels = useMemo(() => {
    if (!assignChatterId) return [];
    const modelIds = data.assignments[assignChatterId] ?? [];
    return data.models.filter((m) => modelIds.includes(m.id));
  }, [assignChatterId, data.assignments, data.models]);

  function handleAssignModelToggle(modelId: string) {
    setAssignCheckedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  }

  async function handleAssignSubmit() {
    if (!assignChatterId) return;
    setAssignLoading(true);
    try {
      await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatterId: assignChatterId,
          shiftDate: assignDate,
          shiftType: assignShiftType,
          modelIds: assignCheckedModels.length > 0 ? assignCheckedModels : null,
          note: assignNote || undefined,
        }),
      });
      setAssignDialogOpen(false);
      await fetchPlanning();
    } catch {
      // erreur silencieuse
    }
    setAssignLoading(false);
  }

  /* --- Edit/Delete dialog --- */
  function openEditDialog(shift: PlanningShift) {
    setEditShift(shift);
    setEditDialogOpen(true);
  }

  async function handleDeleteShift() {
    if (!editShift) return;
    setEditLoading(true);
    try {
      await fetch(`/api/planning/${editShift.id}`, { method: "DELETE" });
      setEditDialogOpen(false);
      await fetchPlanning();
    } catch {
      // erreur silencieuse
    }
    setEditLoading(false);
  }

  /* --- Ticket helpers --- */
  const pendingTickets = tickets.filter((t) => t.status === "PENDING");
  const resolvedTickets = tickets.filter((t) => t.status !== "PENDING");

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planning</h1>
          <div className="mt-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Sem. du {format(monday, "d MMMM yyyy", { locale: fr })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleDuplicateWeek}
          disabled={duplicating}
        >
          {duplicating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Dupliquer semaine
        </Button>
      </div>

      {/* Sélecteur de vue */}
      <div className="flex items-center gap-0">
        <Button
          variant={viewMode === "shifts" ? "default" : "outline"}
          className={cn(
            "rounded-r-none",
            viewMode === "shifts" && "bg-foreground text-background hover:bg-foreground/90"
          )}
          onClick={() => setViewMode("shifts")}
        >
          Vue shifts
        </Button>
        <Button
          variant={viewMode === "models" ? "default" : "outline"}
          className={cn(
            "rounded-l-none",
            viewMode === "models" && "bg-foreground text-background hover:bg-foreground/90"
          )}
          onClick={() => setViewMode("models")}
        >
          Vue modèles
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Shifts
              </span>
            </div>
            <p className="text-2xl font-bold">{kpis.shiftCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Heures planifiées
              </span>
            </div>
            <p className="text-2xl font-bold">{kpis.plannedHours}h</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Timer className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Heures pointées
              </span>
            </div>
            <p className="text-2xl font-bold">
              {kpis.clockedHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Couverture
              </span>
            </div>
            <p className="text-2xl font-bold">
              {kpis.coverage.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-3">
        <Badge className={cn("text-xs px-3 py-1", SHIFT_BADGE_STYLE.SHIFT_A)}>
          Shift A 12h–20h
        </Badge>
        <Badge className={cn("text-xs px-3 py-1", SHIFT_BADGE_STYLE.SHIFT_B)}>
          Shift B 20h–4h
        </Badge>
        <Badge className={cn("text-xs px-3 py-1", SHIFT_BADGE_STYLE.SHIFT_C)}>
          Shift C 4h–8h
        </Badge>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : viewMode === "shifts" ? (
        /* ========== VUE SHIFTS ========== */
        <div className="overflow-x-auto rounded-lg border">
          {/* En-tête jours */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b">
            <div className="p-2" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-2 text-center text-sm font-medium border-l",
                  isSameDay(day, today) && "bg-yellow-50/50"
                )}
              >
                {format(day, "EEE d", { locale: fr })}
              </div>
            ))}
          </div>

          {/* Lignes de shifts */}
          {SHIFT_TYPES.map((shiftType) => (
            <div
              key={shiftType}
              className="grid grid-cols-[100px_repeat(7,1fr)] border-b last:border-b-0"
            >
              {/* Label de ligne */}
              <div className="p-2 flex items-center">
                <Badge className={cn("text-xs", SHIFT_BADGE_STYLE[shiftType])}>
                  {SHIFTS[shiftType].label}
                </Badge>
              </div>

              {/* Cellules par jour */}
              {days.map((day) => {
                const cellShifts = getShiftsForCell(day, shiftType);
                const isToday = isSameDay(day, today);
                const grouped = groupByChatter(cellShifts);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-1.5 border-l min-h-[56px] flex flex-wrap items-start gap-1",
                      isToday && "bg-yellow-50/50"
                    )}
                  >
                    {grouped.length > 0 ? (
                      grouped.map((g) => (
                        <button
                          key={g.chatter.id}
                          onClick={() => openEditDialog(g.shifts[0])}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer text-left"
                        >
                          <span>{g.chatter.name}</span>
                          {g.models.some((m) => m !== null) && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              {"→ "}
                              {g.models
                                .filter((m): m is ModelInfo => m !== null)
                                .map((m) => m.stageName)
                                .join(", ")}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground mx-auto"
                        onClick={() => openAssignDialog(day, shiftType)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* ========== VUE MODÈLES ========== */
        <div className="overflow-x-auto rounded-lg border">
          {/* En-tête jours */}
          <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b">
            <div className="p-2" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-2 text-center text-sm font-medium border-l",
                  isSameDay(day, today) && "bg-yellow-50/50"
                )}
              >
                {format(day, "EEE d", { locale: fr })}
              </div>
            ))}
          </div>

          {/* Ligne par modèle */}
          {data.models.map((model) => (
            <div
              key={model.id}
              className="grid grid-cols-[160px_repeat(7,1fr)] border-b last:border-b-0"
            >
              {/* Label modèle */}
              <div className="p-2 flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  {model.photoUrl ? (
                    <AvatarImage src={model.photoUrl} alt={model.stageName} />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {model.stageName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">
                  {model.stageName}
                </span>
              </div>

              {/* Cellules par jour */}
              {days.map((day) => {
                const cellShifts = getShiftsForModelDay(model.id, day);
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-1.5 border-l min-h-[56px] flex flex-wrap items-start gap-1",
                      isToday && "bg-yellow-50/50",
                      cellShifts.length === 0 && "bg-gray-50"
                    )}
                  >
                    {cellShifts.length > 0 ? (
                      cellShifts.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => openEditDialog(s)}
                          className={cn(
                            "border-l-2 rounded-r px-1.5 py-0.5 text-xs font-medium hover:bg-gray-100 transition-colors cursor-pointer bg-white",
                            SHIFT_BORDER[s.shiftType]
                          )}
                        >
                          {s.chatter.name} ({SHIFTS[s.shiftType].label.replace("Shift ", "")})
                        </button>
                      ))
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground mx-auto"
                        onClick={() =>
                          openAssignDialog(day, "SHIFT_A", model.id)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ========== DIALOG ASSIGNER ========== */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un shift</DialogTitle>
          </DialogHeader>

          {assignDate && (
            <p className="text-sm text-muted-foreground">
              {format(new Date(assignDate + "T00:00:00"), "EEEE d MMMM yyyy", {
                locale: fr,
              })}{" "}
              — {SHIFTS[assignShiftType].label} ({SHIFT_LABELS[assignShiftType]})
            </p>
          )}

          <div className="space-y-4 mt-2">
            {/* Sélection shift type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de shift</label>
              <Select
                value={assignShiftType}
                onValueChange={(v) => setAssignShiftType(v as ShiftType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {SHIFTS[st].label} ({SHIFT_LABELS[st]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélection chatter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Chatter</label>
              <Select
                value={assignChatterId}
                onValueChange={(v) => {
                  setAssignChatterId(v);
                  // Réinitialiser les modèles cochés sauf si pré-rempli
                  if (assignModelId) {
                    setAssignCheckedModels([assignModelId]);
                  } else {
                    setAssignCheckedModels([]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un chatter" />
                </SelectTrigger>
                <SelectContent>
                  {data.chatters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélection modèles (checkboxes) */}
            {assignChatterId && assignAvailableModels.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Modèles</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {assignAvailableModels.map((model) => (
                    <div key={model.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`model-${model.id}`}
                        checked={assignCheckedModels.includes(model.id)}
                        onCheckedChange={() =>
                          handleAssignModelToggle(model.id)
                        }
                      />
                      <label
                        htmlFor={`model-${model.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {model.stageName}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optionnel)</label>
              <Input
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="Ajouter une note..."
              />
            </div>

            {/* Soumettre */}
            <Button
              onClick={handleAssignSubmit}
              disabled={!assignChatterId || assignLoading}
              className="w-full"
            >
              {assignLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assigner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== DIALOG ÉDITER / SUPPRIMER ========== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détail du shift</DialogTitle>
          </DialogHeader>

          {editShift && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Chatter :</span>{" "}
                  {editShift.chatter.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Modèle :</span>{" "}
                  {editShift.model?.stageName ?? "Aucun"}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Shift :</span>{" "}
                  <Badge
                    className={cn(
                      "text-xs ml-1",
                      SHIFT_BADGE_STYLE[editShift.shiftType]
                    )}
                  >
                    {SHIFTS[editShift.shiftType].label} (
                    {SHIFT_LABELS[editShift.shiftType]})
                  </Badge>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Date :</span>{" "}
                  {format(
                    new Date(editShift.shiftDate),
                    "EEEE d MMMM yyyy",
                    { locale: fr }
                  )}
                </p>
                {editShift.note && (
                  <p className="text-sm">
                    <span className="font-medium">Note :</span>{" "}
                    {editShift.note}
                  </p>
                )}
              </div>

              <Button
                variant="destructive"
                onClick={handleDeleteShift}
                disabled={editLoading}
                className="w-full"
              >
                {editLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Supprimer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== TICKETS ========== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            Demandes de correction
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {pendingTickets.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune demande en attente
          </p>
        )}

        <div className="grid gap-3">
          {pendingTickets.map((ticket) => (
            <Card key={ticket.id} className="border-l-4 border-l-orange-400">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {ticket.chatter?.name ?? "Chatter"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.shiftDate
                        ? format(new Date(ticket.shiftDate), "d MMMM yyyy", {
                            locale: fr,
                          })
                        : ""}{" "}
                      — {SHIFTS[ticket.shiftType]?.label ?? ticket.shiftType}
                    </p>
                    {ticket.comment && (
                      <p className="mt-1 text-sm">{ticket.comment}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tickets résolus */}
        {resolvedTickets.length > 0 && (
          <div className="space-y-1">
            {resolvedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground"
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    ticket.status === "APPROVED"
                      ? "border-emerald-300 text-emerald-600"
                      : "border-red-300 text-red-600"
                  )}
                >
                  {ticket.status === "APPROVED" ? "Approuvé" : "Rejeté"}
                </Badge>
                <span>{ticket.chatter?.name ?? "Chatter"}</span>
                <span>
                  {ticket.shiftDate
                    ? format(new Date(ticket.shiftDate), "d MMM", {
                        locale: fr,
                      })
                    : ""}
                </span>
                <span>
                  {SHIFTS[ticket.shiftType]?.label ?? ticket.shiftType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
