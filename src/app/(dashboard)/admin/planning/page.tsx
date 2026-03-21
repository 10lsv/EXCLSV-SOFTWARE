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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface PlanningShift {
  id: string;
  chatterId: string;
  shiftDate: string;
  shiftType: ShiftType;
  note?: string;
  chatter: ChatterInfo;
}

interface ClockRecord {
  id: string;
  chatterId: string;
  shiftDate: string;
  shiftType: ShiftType;
  clockIn: string;
  clockOut?: string;
  source?: string;
}

interface Ticket {
  id: string;
  chatterId: string;
  chatter?: ChatterInfo;
  shiftDate: string;
  shiftType: ShiftType;
  comment?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  screenshotData?: string;
  createdAt: string;
}

interface ChatterOption {
  id: string;
  userId: string;
  user: { id: string; name: string };
}

/* ---------- Constants ---------- */

const SHIFT_TYPES: ShiftType[] = ["SHIFT_A", "SHIFT_B", "SHIFT_C"];
const DAY_COUNT = 7;
const MAX_SLOTS = SHIFT_TYPES.length * DAY_COUNT; // 21

const SHIFT_BG: Record<ShiftType, string> = {
  SHIFT_A: "bg-blue-500",
  SHIFT_B: "bg-violet-500",
  SHIFT_C: "bg-amber-500",
};

const SHIFT_BG_LIGHT: Record<ShiftType, string> = {
  SHIFT_A: "bg-blue-50 text-blue-700",
  SHIFT_B: "bg-violet-50 text-violet-700",
  SHIFT_C: "bg-amber-50 text-amber-700",
};

/* ---------- Component ---------- */

export default function AdminPlanningPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState<PlanningShift[]>([]);
  const [clocks, setClocks] = useState<ClockRecord[]>([]);
  const [chatters, setChatters] = useState<ChatterOption[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogDay, setDialogDay] = useState<Date | null>(null);
  const [dialogShiftType, setDialogShiftType] = useState<ShiftType>("SHIFT_A");
  const [dialogChatterId, setDialogChatterId] = useState("");
  const [dialogNote, setDialogNote] = useState("");
  const [dialogShift, setDialogShift] = useState<PlanningShift | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

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
      if (json.success ?? json.shifts) {
        setShifts(json.shifts ?? json.data?.shifts ?? []);
        setClocks(json.clocks ?? json.data?.clocks ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [monday]);

  const fetchChatters = useCallback(async () => {
    try {
      const res = await fetch("/api/chatters");
      const json = await res.json();
      if (json.success) {
        setChatters(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/clock/tickets");
      const json = await res.json();
      if (json.success) {
        setTickets(json.data ?? json.tickets ?? []);
      } else {
        setTickets(json.data ?? json.tickets ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchChatters();
    fetchTickets();
  }, [fetchChatters, fetchTickets]);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  /* --- KPI calculations --- */
  const kpis = useMemo(() => {
    const shiftCount = shifts.length;
    const plannedHours = shifts.reduce(
      (sum, s) => sum + getShiftDuration(s.shiftType),
      0
    );
    const clockedHours = clocks.reduce((sum, c) => {
      if (!c.clockIn) return sum;
      const start = new Date(c.clockIn).getTime();
      const end = c.clockOut ? new Date(c.clockOut).getTime() : Date.now();
      return sum + (end - start) / 3_600_000;
    }, 0);
    const coverage = MAX_SLOTS > 0 ? (shiftCount / MAX_SLOTS) * 100 : 0;

    return { shiftCount, plannedHours, clockedHours, coverage };
  }, [shifts, clocks]);

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
      // ignore
    }
    setDuplicating(false);
  }

  /* --- Grid helpers --- */
  function getShiftsForCell(day: Date, shiftType: ShiftType) {
    const dayStr = format(day, "yyyy-MM-dd");
    return shifts.filter(
      (s) => s.shiftDate.startsWith(dayStr) && s.shiftType === shiftType
    );
  }

  /* --- Dialog handlers --- */
  function openCreateDialog(day: Date, shiftType: ShiftType) {
    setDialogMode("create");
    setDialogDay(day);
    setDialogShiftType(shiftType);
    setDialogChatterId("");
    setDialogNote("");
    setDialogShift(null);
    setDialogOpen(true);
  }

  function openEditDialog(shift: PlanningShift) {
    setDialogMode("edit");
    setDialogDay(new Date(shift.shiftDate));
    setDialogShiftType(shift.shiftType);
    setDialogChatterId(shift.chatterId);
    setDialogNote(shift.note ?? "");
    setDialogShift(shift);
    setDialogOpen(true);
  }

  async function handleDialogSubmit() {
    if (!dialogChatterId) return;
    setDialogLoading(true);
    try {
      if (dialogMode === "create" && dialogDay) {
        await fetch("/api/planning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatterId: dialogChatterId,
            shiftDate: format(dialogDay, "yyyy-MM-dd"),
            shiftType: dialogShiftType,
            note: dialogNote || undefined,
          }),
        });
      } else if (dialogMode === "edit" && dialogShift) {
        await fetch(`/api/planning/${dialogShift.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatterId: dialogChatterId,
            shiftType: dialogShiftType,
            note: dialogNote || undefined,
          }),
        });
      }
      setDialogOpen(false);
      await fetchPlanning();
    } catch {
      // ignore
    }
    setDialogLoading(false);
  }

  async function handleDeleteShift() {
    if (!dialogShift) return;
    setDialogLoading(true);
    try {
      await fetch(`/api/planning/${dialogShift.id}`, { method: "DELETE" });
      setDialogOpen(false);
      await fetchPlanning();
    } catch {
      // ignore
    }
    setDialogLoading(false);
  }

  /* --- Ticket helpers --- */
  const pendingTickets = tickets.filter((t) => t.status === "PENDING");
  const resolvedTickets = tickets.filter((t) => t.status !== "PENDING");

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Shifts cette semaine
              </span>
            </div>
            <p className="text-2xl font-bold">{kpis.shiftCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Heures planifiees
              </span>
            </div>
            <p className="text-2xl font-bold">{kpis.plannedHours}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Timer className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Heures pointees
              </span>
            </div>
            <p className="text-2xl font-bold">
              {kpis.clockedHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>

        <Card>
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

      {/* Legend */}
      <div className="flex items-center gap-3">
        {SHIFT_TYPES.map((st) => (
          <Badge
            key={st}
            className={cn(
              "text-white text-xs px-3 py-1",
              SHIFT_BG[st]
            )}
          >
            {SHIFTS[st].label} {SHIFT_LABELS[st]}
          </Badge>
        ))}
      </div>

      {/* Weekly Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          {/* Header row */}
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

          {/* Shift rows */}
          {SHIFT_TYPES.map((shiftType) => (
            <div
              key={shiftType}
              className="grid grid-cols-[100px_repeat(7,1fr)] border-b last:border-b-0"
            >
              {/* Row label */}
              <div className="p-2 flex items-center">
                <Badge
                  className={cn("text-white text-xs", SHIFT_BG[shiftType])}
                >
                  {SHIFTS[shiftType].label}
                </Badge>
              </div>

              {/* Day cells */}
              {days.map((day) => {
                const cellShifts = getShiftsForCell(day, shiftType);
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-1.5 border-l min-h-[56px] flex flex-wrap items-start gap-1",
                      isToday && "bg-yellow-50/50"
                    )}
                  >
                    {cellShifts.length > 0 ? (
                      cellShifts.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => openEditDialog(s)}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          {s.chatter.name}
                        </button>
                      ))
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground mx-auto"
                        onClick={() => openCreateDialog(day, shiftType)}
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

      {/* Assign / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? "Assigner un shift"
                : `Modifier le shift`}
            </DialogTitle>
          </DialogHeader>

          {dialogDay && (
            <p className="text-sm text-muted-foreground">
              {format(dialogDay, "EEEE d MMMM yyyy", { locale: fr })} —{" "}
              {SHIFTS[dialogShiftType].label} ({SHIFT_LABELS[dialogShiftType]})
            </p>
          )}

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Chatter</Label>
              <Select
                value={dialogChatterId}
                onValueChange={setDialogChatterId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un chatter" />
                </SelectTrigger>
                <SelectContent>
                  {chatters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Note (optionnel)</Label>
              <Textarea
                value={dialogNote}
                onChange={(e) => setDialogNote(e.target.value)}
                placeholder="Ajouter une note..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleDialogSubmit}
                disabled={!dialogChatterId || dialogLoading}
                className="flex-1"
              >
                {dialogLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {dialogMode === "create" ? "Assigner" : "Enregistrer"}
              </Button>

              {dialogMode === "edit" && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteShift}
                  disabled={dialogLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            Demandes de correction
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Pending tickets */}
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
                  <div className="flex items-center gap-3">
                    {ticket.chatter?.avatar ? (
                      <img
                        src={ticket.chatter.avatar}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {(ticket.chatter?.name ?? "?").charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {ticket.chatter?.name ?? "Chatter"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.shiftDate
                          ? format(
                              new Date(ticket.shiftDate),
                              "d MMMM yyyy",
                              { locale: fr }
                            )
                          : ""}{" "}
                        — {SHIFTS[ticket.shiftType]?.label ?? ticket.shiftType}
                      </p>
                      {ticket.comment && (
                        <p className="mt-1 text-sm">{ticket.comment}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                    >
                      Rejeter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resolved tickets */}
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
                  {ticket.status === "APPROVED" ? "Approuve" : "Rejete"}
                </Badge>
                <span>{ticket.chatter?.name ?? "Chatter"}</span>
                <span>
                  {ticket.shiftDate
                    ? format(new Date(ticket.shiftDate), "d MMM", {
                        locale: fr,
                      })
                    : ""}
                </span>
                <span>{SHIFTS[ticket.shiftType]?.label ?? ticket.shiftType}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
