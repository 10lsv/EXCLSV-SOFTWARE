"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  CheckCircle,
  Clock,
  LogIn,
  LogOut,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn, getMondayUTC } from "@/lib/utils";
import {
  SHIFTS,
  SHIFT_LABELS,
  type ShiftType,
} from "@/lib/shifts";
import { format, addDays, isSameDay, subDays, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

/* ---------- Types ---------- */

interface ClockStatus {
  shift: {
    id: string;
    shiftType: ShiftType;
    shiftDate: string;
  } | null;
  clock: {
    id: string;
    clockIn: string;
    clockOut: string | null;
  } | null;
}

interface ClockRecord {
  id: string;
  chatterId: string;
  shiftDate: string;
  shiftType: ShiftType;
  clockIn: string;
  clockOut?: string | null;
  source?: string;
}

interface Ticket {
  id: string;
  shiftDate: string;
  shiftType: ShiftType;
  comment?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

/* ---------- Constants ---------- */

const SHIFT_TYPES: ShiftType[] = ["SHIFT_A", "SHIFT_B", "SHIFT_C"];

const SHIFT_BG: Record<ShiftType, string> = {
  SHIFT_A: "bg-blue-500",
  SHIFT_B: "bg-violet-500",
  SHIFT_C: "bg-amber-500",
};

/* ---------- Helpers ---------- */

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function formatHourFromDate(d: Date): string {
  return format(d, "HH'h'mm");
}

/* ---------- Component ---------- */

export default function ChatterPlanningPage() {
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [records, setRecords] = useState<ClockRecord[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ticket dialog
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketDate, setTicketDate] = useState("");
  const [ticketShiftType, setTicketShiftType] = useState("");
  const [ticketComment, setTicketComment] = useState("");
  const [ticketLoading, setTicketLoading] = useState(false);

  // Clock action loading
  const [clockActionLoading, setClockActionLoading] = useState(false);

  const today = useMemo(() => new Date(), []);

  const monday = useMemo(() => getMondayUTC(), []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday]
  );

  // Last 7 days for ticket date picker
  const last7Days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => subDays(today, i)),
    [today]
  );

  /* --- Fetchers --- */

  const fetchClockStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/clock/status");
      const json = await res.json();
      if (json.success !== false) {
        setClockStatus(json.data ?? json);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/clock/records?weekStart=${monday.toISOString()}`
      );
      const json = await res.json();
      if (json.success !== false) {
        setRecords(json.data ?? json.records ?? []);
      }
    } catch {
      // ignore
    }
  }, [monday]);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/clock/tickets");
      const json = await res.json();
      if (json.success !== false) {
        setTickets(json.data ?? json.tickets ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchClockStatus(), fetchRecords(), fetchTickets()]);
      setLoading(false);
    }
    init();
  }, [fetchClockStatus, fetchRecords, fetchTickets]);

  // Poll clock status every 10s
  useEffect(() => {
    const interval = setInterval(fetchClockStatus, 10_000);
    return () => clearInterval(interval);
  }, [fetchClockStatus]);

  // Timer for active clock
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      clockStatus?.clock?.clockIn &&
      !clockStatus.clock.clockOut
    ) {
      const clockInTime = new Date(clockStatus.clock.clockIn).getTime();
      const update = () => setElapsed(Date.now() - clockInTime);
      update();
      timerRef.current = setInterval(update, 1_000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clockStatus?.clock?.clockIn, clockStatus?.clock?.clockOut]);

  /* --- Clock actions --- */

  async function handleClockIn() {
    setClockActionLoading(true);
    try {
      await fetch("/api/clock/in", { method: "POST" });
      await fetchClockStatus();
    } catch {
      // ignore
    }
    setClockActionLoading(false);
  }

  async function handleClockOut() {
    setClockActionLoading(true);
    try {
      await fetch("/api/clock/out", { method: "POST" });
      await Promise.all([fetchClockStatus(), fetchRecords()]);
    } catch {
      // ignore
    }
    setClockActionLoading(false);
  }

  /* --- Ticket submission --- */

  async function handleTicketSubmit() {
    if (!ticketDate || !ticketShiftType) return;
    setTicketLoading(true);
    try {
      await fetch("/api/clock/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftDate: ticketDate,
          shiftType: ticketShiftType,
          comment: ticketComment || undefined,
        }),
      });
      setTicketDialogOpen(false);
      setTicketDate("");
      setTicketShiftType("");
      setTicketComment("");
      await fetchTickets();
    } catch {
      // ignore
    }
    setTicketLoading(false);
  }

  /* --- Week helpers --- */

  function getRecordForDay(day: Date): ClockRecord | undefined {
    const dayStr = format(day, "yyyy-MM-dd");
    return records.find((r) => r.shiftDate.startsWith(dayStr));
  }

  /* --- Week stats --- */
  const weekStats = useMemo(() => {
    const shiftCount = records.length;
    const clockedHours = records.reduce((sum, r) => {
      if (!r.clockIn) return sum;
      const start = new Date(r.clockIn).getTime();
      const end = r.clockOut ? new Date(r.clockOut).getTime() : 0;
      if (!end) return sum;
      return sum + (end - start) / 3_600_000;
    }, 0);
    return { shiftCount, clockedHours };
  }, [records]);

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Chargement...
      </div>
    );
  }

  const hasShiftToday = !!clockStatus?.shift;
  const isClockedIn =
    hasShiftToday &&
    !!clockStatus?.clock?.clockIn &&
    !clockStatus?.clock?.clockOut;
  const isShiftDone =
    hasShiftToday &&
    !!clockStatus?.clock?.clockIn &&
    !!clockStatus?.clock?.clockOut;

  const completedDuration =
    isShiftDone && clockStatus?.clock
      ? new Date(clockStatus.clock.clockOut!).getTime() -
        new Date(clockStatus.clock.clockIn).getTime()
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon Planning</h1>
      </div>

      {/* Clock Section */}
      <Card>
        <CardContent className="p-6">
          {!hasShiftToday ? (
            /* No shift today */
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Pas de shift aujourd&apos;hui
              </p>
            </div>
          ) : isShiftDone ? (
            /* Shift done */
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <p className="text-emerald-600 font-medium text-lg">
                Shift termine — {formatDuration(completedDuration)}
              </p>
            </div>
          ) : isClockedIn ? (
            /* Clocked in, waiting for clock out */
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  En cours depuis
                </p>
                <p className="text-2xl font-bold">{formatDuration(elapsed)}</p>
              </div>
              <Button
                onClick={handleClockOut}
                disabled={clockActionLoading}
                className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 text-white"
              >
                {clockActionLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-5 w-5" />
                )}
                Pointer mon depart
              </Button>
            </div>
          ) : (
            /* Shift exists but not clocked in yet */
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {SHIFTS[clockStatus!.shift!.shiftType].label} —{" "}
                  {SHIFT_LABELS[clockStatus!.shift!.shiftType]}
                </p>
              </div>
              <Button
                onClick={handleClockIn}
                disabled={clockActionLoading}
                className="w-full h-14 text-lg bg-black hover:bg-black/90 text-white"
              >
                {clockActionLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Pointer mon arrivee
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Week List */}
      <div className="space-y-3">
        {days.map((day) => {
          const record = getRecordForDay(day);
          const isToday = isSameDay(day, today);
          const isPast =
            !isToday &&
            isBefore(startOfDay(day), startOfDay(today));

          return (
            <Card
              key={day.toISOString()}
              className={cn(isToday && "border-primary border-2")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium capitalize",
                        isToday && "text-primary"
                      )}
                    >
                      {format(day, "EEEE d MMMM", { locale: fr })}
                    </p>

                    {/* Today: use clock status */}
                    {isToday && hasShiftToday && clockStatus?.shift && (
                      <Badge
                        className={cn(
                          "mt-1 text-white text-xs",
                          SHIFT_BG[clockStatus.shift.shiftType]
                        )}
                      >
                        {SHIFTS[clockStatus.shift.shiftType].label} ·{" "}
                        {SHIFT_LABELS[clockStatus.shift.shiftType]}
                      </Badge>
                    )}

                    {isToday && !hasShiftToday && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Repos
                      </p>
                    )}

                    {/* Other days: use records */}
                    {!isToday && record && (
                      <Badge
                        className={cn(
                          "mt-1 text-white text-xs",
                          SHIFT_BG[record.shiftType]
                        )}
                      >
                        {SHIFTS[record.shiftType].label} ·{" "}
                        {SHIFT_LABELS[record.shiftType]}
                      </Badge>
                    )}

                    {!isToday && !record && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Repos
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    {/* Today clock info */}
                    {isToday && isShiftDone && clockStatus?.clock && (
                      <p className="text-xs text-emerald-600 font-medium">
                        Pointe{" "}
                        {formatHourFromDate(
                          new Date(clockStatus.clock.clockIn)
                        )}{" "}
                        →{" "}
                        {formatHourFromDate(
                          new Date(clockStatus.clock.clockOut!)
                        )}{" "}
                        ({formatDuration(completedDuration)})
                      </p>
                    )}
                    {isToday && isClockedIn && (
                      <p className="text-xs text-blue-600 font-medium">
                        En cours...
                      </p>
                    )}

                    {/* Past days with record */}
                    {!isToday && record && record.clockOut && (
                      <p className="text-xs text-muted-foreground">
                        Pointe{" "}
                        {formatHourFromDate(new Date(record.clockIn))} →{" "}
                        {formatHourFromDate(new Date(record.clockOut))}{" "}
                        (
                        {formatDuration(
                          new Date(record.clockOut).getTime() -
                            new Date(record.clockIn).getTime()
                        )}
                        )
                      </p>
                    )}

                    {!isToday && record && !record.clockOut && (
                      <p className="text-xs text-blue-600 font-medium">
                        En cours...
                      </p>
                    )}

                    {/* Past days without record & had shift (we don't know from records alone, so show for all past without record) */}
                    {isPast && !record && (
                      <p className="text-xs text-red-500 font-medium">
                        Non pointe
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ticket Section */}
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setTicketDialogOpen(true)}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          J&apos;ai oublie de pointer
        </Button>

        {/* Ticket dialog */}
        <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demande de correction</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Select value={ticketDate} onValueChange={setTicketDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une date" />
                  </SelectTrigger>
                  <SelectContent>
                    {last7Days.map((d) => (
                      <SelectItem
                        key={d.toISOString()}
                        value={format(d, "yyyy-MM-dd")}
                      >
                        {format(d, "EEEE d MMMM", { locale: fr })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type de shift</Label>
                <Select
                  value={ticketShiftType}
                  onValueChange={setTicketShiftType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_TYPES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {SHIFTS[st].label} — {SHIFT_LABELS[st]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Commentaire</Label>
                <Textarea
                  value={ticketComment}
                  onChange={(e) => setTicketComment(e.target.value)}
                  placeholder="Expliquez la situation..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleTicketSubmit}
                disabled={!ticketDate || !ticketShiftType || ticketLoading}
                className="w-full"
              >
                {ticketLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Envoyer la demande
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* My tickets */}
        {tickets.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Mes demandes
            </h3>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2"
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs shrink-0",
                    ticket.status === "PENDING" &&
                      "border-orange-300 text-orange-600",
                    ticket.status === "APPROVED" &&
                      "border-emerald-300 text-emerald-600",
                    ticket.status === "REJECTED" &&
                      "border-red-300 text-red-600"
                  )}
                >
                  {ticket.status === "PENDING"
                    ? "En attente"
                    : ticket.status === "APPROVED"
                    ? "Approuve"
                    : "Rejete"}
                </Badge>
                <span className="text-sm">
                  {ticket.shiftDate
                    ? format(new Date(ticket.shiftDate), "d MMM", {
                        locale: fr,
                      })
                    : ""}
                </span>
                <span className="text-sm text-muted-foreground">
                  {SHIFTS[ticket.shiftType]?.label ?? ticket.shiftType}
                </span>
                {ticket.comment && (
                  <span className="text-xs text-muted-foreground truncate">
                    — {ticket.comment}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Week stats bar */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Shifts : {weekStats.shiftCount} | Heures pointees :{" "}
          {weekStats.clockedHours.toFixed(1)}h
        </p>
      </div>
    </div>
  );
}
