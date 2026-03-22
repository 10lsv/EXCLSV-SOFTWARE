"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Loader2, Eye, Wifi, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/* ---------- Types ---------- */

interface ModelAssignment {
  model: { id: string; stageName: string; photoUrl?: string };
}

interface Chatter {
  id: string;
  userId: string;
  hourlyRate: number;
  commissionRate: number;
  user: { id: string; name: string; email: string; avatar?: string };
  assignments: ModelAssignment[];
  weekHours: number;
  status: "online" | "not_clocked" | "off_shift";
}

interface Kpis {
  totalChatters: number;
  onlineCount: number;
  totalWeekHours: number;
}

/* ---------- Helpers ---------- */

function fmtHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h`;
}

/* ---------- Inline Editable Cell ---------- */

function InlineEdit({
  value,
  suffix,
  onSave,
  step = "1",
  isZero,
}: {
  value: number;
  suffix: string;
  onSave: (val: number) => void;
  step?: string;
  isZero?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed !== value) {
      onSave(parsed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        step={step}
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-20 text-sm text-right"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={cn(
        "text-sm cursor-pointer hover:underline",
        isZero ? "text-red-500 font-medium" : ""
      )}
    >
      {isZero ? "Non configuré" : `${value}${suffix}`}
    </button>
  );
}

/* ---------- Component ---------- */

export default function AdminChattersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [chatters, setChatters] = useState<Chatter[]>([]);
  const [kpis, setKpis] = useState<Kpis>({ totalChatters: 0, onlineCount: 0, totalWeekHours: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChatters() {
      try {
        const res = await fetch("/api/chatters");
        const json = await res.json();
        if (json?.data) {
          setChatters(json.data.chatters || []);
          setKpis(json.data.kpis || { totalChatters: 0, onlineCount: 0, totalWeekHours: 0 });
        }
      } catch {
        // silent
      }
      setLoading(false);
    }
    fetchChatters();
  }, []);

  async function updateChatter(userId: string, field: string, value: number) {
    try {
      const res = await fetch(`/api/chatters/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json();
      if (json?.success || res.ok) {
        setChatters((prev) =>
          prev.map((c) =>
            c.user.id === userId
              ? { ...c, [field]: value }
              : c
          )
        );
        toast({ title: field === "hourlyRate" ? "Taux mis à jour" : "Commission mise à jour" });
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chatters</h1>
          <p className="text-sm text-muted-foreground">
            {kpis.totalChatters} chatter{kpis.totalChatters > 1 ? "s" : ""}
          </p>
        </div>
        <Button disabled className="opacity-50">
          + Nouveau chatter
          <span className="ml-2 text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
            bientôt
          </span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total chatters</p>
              <p className="text-2xl font-bold">{kpis.totalChatters}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En ligne</p>
              <p className="text-2xl font-bold text-green-600">{kpis.onlineCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Heures cette semaine</p>
              <p className="text-2xl font-bold text-blue-600">{fmtHours(kpis.totalWeekHours)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chatters table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chatter</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Modèles assignées</TableHead>
                <TableHead className="text-right">Taux/h</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Heures (semaine)</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : chatters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Aucun chatter
                  </TableCell>
                </TableRow>
              ) : (
                chatters.map((c) => (
                  <TableRow key={c.user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-100 text-xs font-medium text-gray-600">
                            {c.user.name
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{c.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.user.email}
                    </TableCell>
                    <TableCell>
                      {c.assignments.length === 0 ? (
                        <span className="text-sm text-muted-foreground italic">Aucune</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {c.assignments.map((a) => (
                            <span
                              key={a.model.id}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                            >
                              {a.model.stageName}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <InlineEdit
                        value={c.hourlyRate}
                        suffix="$/h"
                        step="0.5"
                        isZero={c.hourlyRate === 0}
                        onSave={(val) => updateChatter(c.user.id, "hourlyRate", val)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <InlineEdit
                        value={c.commissionRate}
                        suffix="%"
                        step="0.5"
                        isZero={c.commissionRate === 0}
                        onSave={(val) => updateChatter(c.user.id, "commissionRate", val)}
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {fmtHours(c.weekHours)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            c.status === "online"
                              ? "bg-green-500"
                              : c.status === "not_clocked"
                                ? "bg-red-500"
                                : "bg-gray-300"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            c.status === "online"
                              ? "text-green-600"
                              : c.status === "not_clocked"
                                ? "text-red-500"
                                : "text-muted-foreground"
                          )}
                        >
                          {c.status === "online"
                            ? "En ligne"
                            : c.status === "not_clocked"
                              ? "Non pointé"
                              : "Hors shift"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/chatters/${c.user.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
