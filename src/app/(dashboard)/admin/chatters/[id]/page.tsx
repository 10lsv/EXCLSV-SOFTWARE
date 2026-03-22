"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Clock, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

/* ---------- Types ---------- */

interface ChatterDetail {
  id: string;
  userId: string;
  hourlyRate: number;
  commissionRate: number;
  user: { id: string; name: string; email: string; avatar?: string; createdAt: string };
  assignments: Array<{
    model: { id: string; stageName: string; photoUrl?: string };
  }>;
  stats: {
    weekHours: number;
    monthHours: number;
    monthTipsMessages: number;
    monthCommission: number;
  };
  recentClocks: Array<{
    id: string;
    shiftDate: string;
    shiftType: string;
    clockIn: string;
    clockOut: string | null;
    source: string;
  }>;
}

/* ---------- Helpers ---------- */

function fmtHours(h: number): string {
  if (!h || isNaN(h)) return "0h";
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h`;
}

function fmt(n: number): string {
  if (!n || isNaN(n)) return "$0";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function clockDuration(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return "En cours";
  const mins = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

function safeDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return format(new Date(val), "d MMMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
}

function safeTime(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return format(new Date(val), "HH:mm");
  } catch {
    return "—";
  }
}

function safeShortDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return format(new Date(val), "d MMM", { locale: fr });
  } catch {
    return "—";
  }
}

/* ---------- Component ---------- */

export default function ChatterDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<ChatterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hourlyRate, setHourlyRate] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchChatter() {
      try {
        const res = await fetch(`/api/chatters/${id}`);
        const json = await res.json();
        if (json?.data) {
          setData(json.data);
          setHourlyRate(String(json.data.hourlyRate ?? 0));
          setCommissionRate(String(json.data.commissionRate ?? 0));
        }
      } catch {
        // silent
      }
      setLoading(false);
    }
    fetchChatter();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/chatters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourlyRate: parseFloat(hourlyRate) || 0,
          commissionRate: parseFloat(commissionRate) || 0,
        }),
      });
      const json = await res.json();
      if (json?.success || res.ok) {
        toast({ title: "Configuration sauvegardée" });
        if (data) {
          setData({
            ...data,
            hourlyRate: parseFloat(hourlyRate) || 0,
            commissionRate: parseFloat(commissionRate) || 0,
          });
        }
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/chatters")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux chatters
        </Button>
        <p className="text-muted-foreground">Chatter introuvable.</p>
      </div>
    );
  }

  const userName = data.user?.name || "Chatter";
  const userEmail = data.user?.email || "";
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const stats = data.stats || { weekHours: 0, monthHours: 0, monthTipsMessages: 0, monthCommission: 0 };
  const assignments = data.assignments || [];
  const recentClocks = data.recentClocks || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/chatters")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux chatters
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-gray-100 text-sm font-medium text-gray-600">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{userName}</h1>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>
        <Badge className="bg-gray-100 text-gray-700 ml-2" variant="secondary">
          Chatter
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Informations */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold">Informations</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Nom</p>
                  <p className="font-medium">{userName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{userEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Membre depuis</p>
                  <p className="font-medium">{safeDate(data.user?.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration financière */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">Configuration financière</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Taux horaire ($/h)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Commission (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sauvegarder
              </Button>
            </CardContent>
          </Card>

          {/* Modèles assignées */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold">Modèles assignées</h2>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune modèle assignée</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div
                      key={a.model.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="h-8 w-8">
                        {a.model.photoUrl && <AvatarImage src={a.model.photoUrl} />}
                        <AvatarFallback className="text-xs">
                          {(a.model.stageName || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{a.model.stageName}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Statistiques */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold">Statistiques</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Heures semaine</p>
                    <p className="text-lg font-bold">{fmtHours(stats.weekHours)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Heures mois</p>
                    <p className="text-lg font-bold">{fmtHours(stats.monthHours)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tips/Msg ce mois</p>
                    <p className="text-lg font-bold">{fmt(stats.monthTipsMessages)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Commission mois</p>
                    <p className="text-lg font-bold text-violet-600">{fmt(stats.monthCommission)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historique shifts récents */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold">Shifts récents</h2>
              {recentClocks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucun shift récent</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Clock-in</TableHead>
                        <TableHead>Clock-out</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentClocks.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs">{safeShortDate(c.shiftDate)}</TableCell>
                          <TableCell className="text-xs">{c.shiftType || "—"}</TableCell>
                          <TableCell className="text-xs">{safeTime(c.clockIn)}</TableCell>
                          <TableCell className="text-xs">{c.clockOut ? safeTime(c.clockOut) : "—"}</TableCell>
                          <TableCell className="text-xs font-medium">{clockDuration(c.clockIn, c.clockOut)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.source || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
