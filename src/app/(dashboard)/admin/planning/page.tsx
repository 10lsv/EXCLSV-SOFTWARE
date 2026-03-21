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
  modelId?: string;
  chatter: ChatterInfo;
  model: ModelInfo | null;
}

interface ClockRecord {
  id: string;
  chatterId: string;
  shiftDate: string;
  clockIn: string;
  clockOut?: string;
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
const SHIFT_LETTERS: Record<ShiftType, string> = {
  SHIFT_A: "A",
  SHIFT_B: "B",
  SHIFT_C: "C",
};

const SHIFT_BADGE_STYLE: Record<ShiftType, string> = {
  SHIFT_A: "bg-blue-100 text-blue-700",
  SHIFT_B: "bg-violet-100 text-violet-700",
  SHIFT_C: "bg-amber-100 text-amber-700",
};

const SHIFT_BORDER_COLOR: Record<ShiftType, string> = {
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
  const [viewMode, setViewMode] = useState<ViewMode>("models");

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDate, setAssignDate] = useState<Date | null>(null);
  const [assignShiftType, setAssignShiftType] = useState<ShiftType>("SHIFT_A");
  const [assignModelId, setAssignModelId] = useState<string>("");
  const [assignModelLocked, setAssignModelLocked] = useState(false);
  const [assignChatterId, setAssignChatterId] = useState<string>("");
  const [assignNote, setAssignNote] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editShift, setEditShift] = useState<PlanningShift | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  /* --- Computed dates --- */
  const monday = useMemo(() => {
    const base = getMondayUTC();
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
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
    fetchPlanning();
  }, [fetchPlanning]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  /* --- KPIs --- */
  const kpis = useMemo(() => {
    const shiftCount = data.shifts.length;
    const plannedHours = data.shifts.reduce(
      (sum, s) => sum + getShiftDuration(s.shiftType as ShiftType),
      0
    );
    const clockedHours = data.clocks.reduce((sum, c) => {
      if (!c.clockOut) return sum;
      return sum + (new Date(c.clockOut).getTime() - new Date(c.clockIn).getTime()) / 3_600_000;
    }, 0);

    let coverage = 0;
    if (viewMode === "shifts") {
      coverage = (shiftCount / 21) * 100;
    } else {
      const pairs = new Set<string>();
      data.shifts.forEach((s) => {
        if (s.model) {
          pairs.add(`${s.model.id}_${s.shiftDate.slice(0, 10)}`);
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

  function getShiftForModelDayType(modelId: string, day: Date, shiftType: ShiftType) {
    const dayStr = format(day, "yyyy-MM-dd");
    return data.shifts.find(
      (s) =>
        s.shiftDate.startsWith(dayStr) &&
        s.model?.id === modelId &&
        s.shiftType === shiftType
    );
  }

  /* --- Group shifts by chatter for shifts view --- */
  function groupByChatter(cellShifts: PlanningShift[]) {
    const map = new Map<
      string,
      { chatter: ChatterInfo; models: (ModelInfo | null)[]; shifts: PlanningShift[] }
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

  /* --- Assign dialog --- */
  function openAssignDialog(
    day: Date,
    shiftType: ShiftType,
    preModelId?: string
  ) {
    setAssignDate(day);
    setAssignShiftType(shiftType);
    setAssignModelId(preModelId ?? "");
    setAssignModelLocked(!!preModelId);
    setAssignChatterId("");
    setAssignNote("");
    setAssignOpen(true);
  }

  // Chatters filtrés par modèle sélectionné
  const filteredChatters = useMemo(() => {
    if (!assignModelId) return [];
    return data.chatters.filter((c) => {
      const assigned = data.assignments[c.id] ?? [];
      return assigned.includes(assignModelId);
    });
  }, [assignModelId, data.chatters, data.assignments]);

  async function handleAssignSubmit() {
    if (!assignChatterId || !assignDate || !assignModelId) return;
    setAssignLoading(true);
    try {
      await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatterId: assignChatterId,
          shiftDate: assignDate.toISOString(),
          shiftType: assignShiftType,
          modelId: assignModelId,
          note: assignNote || undefined,
        }),
      });
      setAssignOpen(false);
      await fetchPlanning();
    } catch {
      // erreur silencieuse
    }
    setAssignLoading(false);
  }

  /* --- Edit dialog --- */
  function openEditDialog(shift: PlanningShift) {
    setEditShift(shift);
    setEditOpen(true);
  }

  async function handleDeleteShift() {
    if (!editShift) return;
    setEditLoading(true);
    try {
      await fetch(`/api/planning/${editShift.id}`, { method: "DELETE" });
      setEditOpen(false);
      await fetchPlanning();
    } catch {
      // erreur silencieuse
    }
    setEditLoading(false);
  }

  /* --- Tickets --- */
  const pendingTickets = tickets.filter((t) => t.status === "PENDING");
  const resolvedTickets = tickets.filter((t) => t.status !== "PENDING");

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* En-tete */}
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

      {/* Toggle vue */}
      <div className="flex items-center gap-0">
        <Button
          variant={viewMode === "shifts" ? "default" : "outline"}
          className={cn(
            "rounded-r-none",
            viewMode === "shifts" &&
              "bg-foreground text-background hover:bg-foreground/90"
          )}
          onClick={() => setViewMode("shifts")}
        >
          Vue shifts
        </Button>
        <Button
          variant={viewMode === "models" ? "default" : "outline"}
          className={cn(
            "rounded-l-none",
            viewMode === "models" &&
              "bg-foreground text-background hover:bg-foreground/90"
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
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement...
        </div>
      ) : viewMode === "models" ? (
        /* ========== VUE MODELES ========== */
        <div className="overflow-x-auto rounded-lg border">
          {/* En-tete jours */}
          <div className="grid grid-cols-[120px_repeat(7,1fr)] border-b">
            <div className="p-2" />
            {weekDays.map((day) => (
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

          {/* Ligne par modele */}
          {data.models.map((model) => (
            <div
              key={model.id}
              className="grid grid-cols-[120px_repeat(7,1fr)] border-b last:border-b-0"
            >
              {/* Label modele */}
              <div className="p-2 flex items-center gap-2 w-[120px]">
                <Avatar className="h-6 w-6 shrink-0">
                  {model.photoUrl ? (
                    <AvatarImage src={model.photoUrl} alt={model.stageName} />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {model.stageName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">
                  {model.stageName}
                </span>
              </div>

              {/* Cellules par jour */}
              {weekDays.map((day) => {
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-1 border-l min-h-[72px] flex flex-col justify-center gap-0.5",
                      isToday && "bg-yellow-50/50"
                    )}
                  >
                    {SHIFT_TYPES.map((st) => {
                      const shift = getShiftForModelDayType(model.id, day, st);
                      const letter = SHIFT_LETTERS[st];

                      return (
                        <div
                          key={st}
                          className="flex items-center gap-1"
                        >
                          <span className="text-[10px] text-muted-foreground w-4 shrink-0">
                            {letter}:
                          </span>
                          {shift ? (
                            <button
                              onClick={() => openEditDialog(shift)}
                              className={cn(
                                "border-l-2 bg-gray-50 rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-gray-100 transition-colors cursor-pointer truncate",
                                SHIFT_BORDER_COLOR[st]
                              )}
                            >
                              {shift.chatter.name}
                            </button>
                          ) : (
                            <button
                              onClick={() => openAssignDialog(day, st, model.id)}
                              className="text-gray-300 hover:text-gray-500 cursor-pointer text-[11px] transition-colors"
                            >
                              +
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* ========== VUE SHIFTS ========== */
        <div className="overflow-x-auto rounded-lg border">
          {/* En-tete jours */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b">
            <div className="p-2" />
            {weekDays.map((day) => (
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
              {/* Label */}
              <div className="p-2 flex items-center">
                <Badge className={cn("text-xs", SHIFT_BADGE_STYLE[shiftType])}>
                  {SHIFTS[shiftType].label}
                </Badge>
              </div>

              {/* Cellules par jour */}
              {weekDays.map((day) => {
                const cellShifts = getShiftsForCell(day, shiftType);
                const isToday = isSameDay(day, today);
                const grouped = groupByChatter(cellShifts);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-1.5 border-l min-h-[56px] flex flex-col items-start gap-1",
                      isToday && "bg-yellow-50/50"
                    )}
                  >
                    {grouped.map((g) => (
                      <button
                        key={g.chatter.id}
                        onClick={() => openEditDialog(g.shifts[0])}
                        className="text-xs hover:bg-gray-100 rounded px-1 py-0.5 transition-colors cursor-pointer text-left truncate max-w-full"
                      >
                        <span className="font-medium">{g.chatter.name}</span>
                        {g.models.some((m) => m !== null) && (
                          <span className="text-muted-foreground">
                            {" → "}
                            {g.models
                              .filter((m): m is ModelInfo => m !== null)
                              .map((m) => m.stageName)
                              .join(", ")}
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => openAssignDialog(day, shiftType)}
                      className="text-xs text-gray-300 hover:text-gray-500 cursor-pointer transition-colors px-1"
                    >
                      + Ajouter
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ========== DIALOG ASSIGNER ========== */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assigner —{" "}
              {assignDate
                ? format(assignDate, "EEEE d MMMM", { locale: fr })
                : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="mb-2">
            <Badge
              className={cn("text-xs px-3 py-1", SHIFT_BADGE_STYLE[assignShiftType])}
            >
              {SHIFTS[assignShiftType].label} ({SHIFT_LABELS[assignShiftType]})
            </Badge>
          </div>

          <div className="space-y-4">
            {/* Type de shift */}
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

            {/* Modele */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Modèle</label>
              <Select
                value={assignModelId}
                onValueChange={(v) => {
                  setAssignModelId(v);
                  setAssignChatterId("");
                }}
                disabled={assignModelLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {data.models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.stageName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chatter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Chatter</label>
              {assignModelId && filteredChatters.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aucun chatter assigné à{" "}
                  {data.models.find((m) => m.id === assignModelId)?.stageName ??
                    "ce modèle"}
                </p>
              ) : (
                <Select
                  value={assignChatterId}
                  onValueChange={setAssignChatterId}
                  disabled={!assignModelId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un chatter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredChatters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

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
              disabled={!assignChatterId || !assignModelId || assignLoading}
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

      {/* ========== DIALOG EDITER / SUPPRIMER ========== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    {ticket.chatter?.avatar ? (
                      <AvatarImage
                        src={ticket.chatter.avatar}
                        alt={ticket.chatter.name}
                      />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {(ticket.chatter?.name ?? "C").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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

        {/* Tickets resolus */}
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
