"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Building2,
  Users,
  Wallet,
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  RefreshCw,
  Calculator,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, endOfMonth, lastDayOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

/* ---------- Types ---------- */

interface Period {
  label: string;
  start: Date;
  end: Date;
}

interface ModelInfo {
  id: string;
  stageName: string;
  photoUrl?: string;
}

interface ChatterInfo {
  id: string;
  name: string;
  avatar?: string;
}

interface Invoice {
  id: string;
  modelId: string;
  model: {
    id: string;
    stageName: string;
    photoUrl?: string;
  };
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  ofFees: number;
  netRevenue: number;
  agencyShare: number;
  amountDue: number;
  status: "DRAFT" | "SENT" | "PAID";
  agencyPercentage?: number;
  modelPercentage?: number;
}

interface Payroll {
  id: string;
  chatterId: string;
  chatter: {
    id: string;
    name: string;
    avatar?: string;
  };
  periodStart: string;
  periodEnd: string;
  hoursWorked: number;
  hourlyRate: number;
  basePay: number;
  tipsRevenue: number;
  messagesRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  totalPay: number;
  status: "DRAFT" | "SENT" | "PAID";
}

/* ---------- Helpers ---------- */

function generatePeriods(): Period[] {
  const periods: Period[] = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  for (let i = 0; i < 12; i++) {
    // Second half: 16th - end of month
    const secondStart = new Date(year, month, 16);
    const secondEnd = lastDayOfMonth(new Date(year, month, 1));
    periods.push({
      label: `16 - ${secondEnd.getDate()} ${format(secondStart, "MMMM yyyy", { locale: fr })}`,
      start: secondStart,
      end: secondEnd,
    });

    // First half: 1st - 15th
    const firstStart = new Date(year, month, 1);
    const firstEnd = new Date(year, month, 15);
    periods.push({
      label: `1 - 15 ${format(firstStart, "MMMM yyyy", { locale: fr })}`,
      start: firstStart,
      end: firstEnd,
    });

    // Go back one month
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
  }

  return periods;
}

function getCurrentPeriodIndex(periods: Period[]): number {
  const now = new Date();
  const day = now.getDate();

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (
      p.start.getFullYear() === now.getFullYear() &&
      p.start.getMonth() === now.getMonth()
    ) {
      if (day >= 16 && p.start.getDate() === 16) return i;
      if (day <= 15 && p.start.getDate() === 1) return i;
    }
  }
  return 0;
}

function fmt(n: number | null | undefined): string {
  return `$${(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/* ---------- Status helpers ---------- */

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  SENT: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  PAID: "bg-green-100 text-green-700 hover:bg-green-200",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyée",
  PAID: "Payée",
};

/* ---------- Component ---------- */

export default function AdminFinancePage() {
  const { toast } = useToast();

  // Periods
  const periods = useMemo(() => generatePeriods(), []);
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(() =>
    getCurrentPeriodIndex(periods)
  );
  const selectedPeriod = periods[selectedPeriodIdx];

  // Data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [chatters, setChatters] = useState<ChatterInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Import states
  const [importLoading, setImportLoading] = useState(false);
  const [importModelId, setImportModelId] = useState("");
  const [importChatterModelId, setImportChatterModelId] = useState("");
  const [importChatterId, setImportChatterId] = useState("");
  const modelFileRef = useRef<HTMLInputElement>(null);
  const chatterFileRef = useRef<HTMLInputElement>(null);

  // Generate loading
  const [genInvoicesLoading, setGenInvoicesLoading] = useState(false);
  const [genPayrollLoading, setGenPayrollLoading] = useState(false);

  /* --- Fetch reference data (models, chatters) --- */
  useEffect(() => {
    async function fetchRefs() {
      try {
        const modelsRes = await fetch("/api/models?limit=100");
        const modelsJson = await modelsRes.json();
        if (modelsJson?.data) {
          const list = modelsJson.data.models || modelsJson.data;
          setModels(
            Array.isArray(list)
              ? list.map((m: ModelInfo) => ({
                  id: m.id,
                  stageName: m.stageName,
                  photoUrl: m.photoUrl,
                }))
              : []
          );
        }

        // Fetch chatters from /api/chatters (returns ChatterProfiles with user info)
        const chattersRes = await fetch("/api/chatters");
        const chattersJson = await chattersRes.json();
        if (chattersJson?.data) {
          const list = Array.isArray(chattersJson.data) ? chattersJson.data : [];
          setChatters(
            list.map((c: { user: { id: string; name: string }; id: string }) => ({
              id: c.user.id,
              name: c.user.name,
            }))
          );
        }
      } catch {
        // silent
      }
    }
    fetchRefs();
  }, []);

  /* --- Fetch invoices & payrolls for selected period --- */
  const fetchPeriodData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodStart: selectedPeriod.start.toISOString(),
        periodEnd: selectedPeriod.end.toISOString(),
      });
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/finance/invoices?${params}`),
        fetch(`/api/finance/payroll?${params}`),
      ]);
      const invJson = await invRes.json();
      const payJson = await payRes.json();
      if (invJson?.data) {
        setInvoices(
          Array.isArray(invJson.data) ? invJson.data : invJson.data.invoices || []
        );
      }
      if (payJson?.data) {
        setPayrolls(
          Array.isArray(payJson.data) ? payJson.data : payJson.data.payrolls || []
        );
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les données.", variant: "destructive" });
    }
    setLoading(false);
  }, [selectedPeriod, toast]);

  useEffect(() => {
    fetchPeriodData();
  }, [fetchPeriodData]);

  /* --- KPIs --- */
  const kpiGross = invoices.reduce((s, i) => s + (i.grossRevenue ?? 0), 0);
  const kpiAgency = invoices.reduce((s, i) => s + (i.agencyShare ?? 0), 0);
  const kpiModels = invoices.reduce((s, i) => s + (i.amountDue ?? 0), 0);
  const kpiPayroll = payrolls.reduce((s, i) => s + (i.totalPay ?? 0), 0);

  /* --- Import model data --- */
  async function handleImportModel() {
    const file = modelFileRef.current?.files?.[0];
    if (!file || !importModelId) {
      toast({ title: "Erreur", description: "Sélectionnez un modèle et un fichier.", variant: "destructive" });
      return;
    }
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("modelId", importModelId);
      const res = await fetch("/api/finance/import/model", { method: "POST", body: fd });
      const json = await res.json();
      if (json?.success || res.ok) {
        toast({ title: "Succès", description: "Données modèle importées avec succès." });
        if (modelFileRef.current) modelFileRef.current.value = "";
        fetchPeriodData();
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur lors de l\u2019import.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de l\u2019import.", variant: "destructive" });
    }
    setImportLoading(false);
  }

  /* --- Import chatter data --- */
  async function handleImportChatter() {
    const file = chatterFileRef.current?.files?.[0];
    if (!file || !importChatterId || !importChatterModelId) {
      toast({ title: "Erreur", description: "Sélectionnez un chatter, un modèle et un fichier.", variant: "destructive" });
      return;
    }
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("chatterId", importChatterId);
      fd.append("modelId", importChatterModelId);
      const res = await fetch("/api/finance/import/chatter", { method: "POST", body: fd });
      const json = await res.json();
      if (json?.success || res.ok) {
        toast({ title: "Succès", description: "Données chatter importées avec succès." });
        if (chatterFileRef.current) chatterFileRef.current.value = "";
        fetchPeriodData();
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur lors de l\u2019import.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de l\u2019import.", variant: "destructive" });
    }
    setImportLoading(false);
  }

  /* --- Generate invoices --- */
  async function handleGenerateInvoices() {
    setGenInvoicesLoading(true);
    try {
      const res = await fetch("/api/finance/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: selectedPeriod.start.toISOString(),
          periodEnd: selectedPeriod.end.toISOString(),
        }),
      });
      const json = await res.json();
      if (json?.success || res.ok) {
        toast({ title: "Succès", description: "Factures générées avec succès." });
        fetchPeriodData();
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur lors de la génération.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de la génération.", variant: "destructive" });
    }
    setGenInvoicesLoading(false);
  }

  /* --- Generate payroll --- */
  async function handleGeneratePayroll() {
    setGenPayrollLoading(true);
    try {
      const res = await fetch("/api/finance/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: selectedPeriod.start.toISOString(),
          periodEnd: selectedPeriod.end.toISOString(),
        }),
      });
      const json = await res.json();
      if (json?.success || res.ok) {
        toast({ title: "Succès", description: "Payroll calculé avec succès." });
        fetchPeriodData();
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur lors du calcul.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur lors du calcul.", variant: "destructive" });
    }
    setGenPayrollLoading(false);
  }

  /* --- Update invoice status --- */
  async function handleInvoiceStatusChange(invoiceId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/finance/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json?.success || res.ok) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoiceId ? { ...inv, status: newStatus as Invoice["status"] } : inv
          )
        );
        toast({ title: "Statut mis à jour" });
      } else {
        toast({ title: "Erreur", description: json?.error || "Impossible de mettre à jour.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    }
  }

  /* --- Update payroll status --- */
  async function handlePayrollStatusChange(payrollId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/finance/payroll/${payrollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json?.success || res.ok) {
        setPayrolls((prev) =>
          prev.map((p) =>
            p.id === payrollId ? { ...p, status: newStatus as Payroll["status"] } : p
          )
        );
        toast({ title: "Statut mis à jour" });
      } else {
        toast({ title: "Erreur", description: json?.error || "Impossible de mettre à jour.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    }
  }

  /* ---------- Render ---------- */

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Factures, payroll et imports de données
          </p>
        </div>

        {/* Period selector */}
        <Select
          value={String(selectedPeriodIdx)}
          onValueChange={(v) => setSelectedPeriodIdx(Number(v))}
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Sélectionner une période" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p, i) => (
              <SelectItem key={i} value={String(i)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <DollarSign className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CA Brut</p>
              <p className="text-2xl font-bold">{fmt(kpiGross)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Part Agence</p>
              <p className="text-2xl font-bold text-green-600">{fmt(kpiAgency)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Part Modèles</p>
              <p className="text-2xl font-bold text-blue-600">{fmt(kpiModels)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Wallet className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Masse Salariale</p>
              <p className="text-2xl font-bold text-violet-600">{fmt(kpiPayroll)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Section */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Importer des données</h2>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Import model data */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Données modèle</h3>
              </div>

              <div className="space-y-2">
                <Label>Modèle</Label>
                <Select value={importModelId} onValueChange={setImportModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.stageName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fichier</Label>
                <Input
                  ref={modelFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="cursor-pointer"
                />
              </div>

              <Button
                onClick={handleImportModel}
                disabled={importLoading}
                className="w-full"
              >
                {importLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Importer
              </Button>
            </CardContent>
          </Card>

          {/* Import chatter data */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Données chatter</h3>
              </div>

              <div className="space-y-2">
                <Label>Chatter</Label>
                <Select value={importChatterId} onValueChange={setImportChatterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un chatter" />
                  </SelectTrigger>
                  <SelectContent>
                    {chatters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modèle</Label>
                <Select value={importChatterModelId} onValueChange={setImportChatterModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.stageName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fichier</Label>
                <Input
                  ref={chatterFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="cursor-pointer"
                />
              </div>

              <Button
                onClick={handleImportChatter}
                disabled={importLoading}
                className="w-full"
              >
                {importLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Importer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoices Section */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Factures modèles</h2>
          <Separator className="flex-1" />
        </div>

        <div className="mb-4">
          <Button onClick={handleGenerateInvoices} disabled={genInvoicesLoading}>
            {genInvoicesLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Générer les factures
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modèle</TableHead>
                  <TableHead className="text-right">CA brut</TableHead>
                  <TableHead className="text-right">% modèle</TableHead>
                  <TableHead className="text-right">Net modèle</TableHead>
                  <TableHead className="text-right">Net agence</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune facture pour cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => {
                    const modelPct = inv.modelPercentage ?? ((inv.grossRevenue ?? 0) > 0 ? Math.round(((inv.amountDue ?? 0) / (inv.grossRevenue ?? 1)) * 100) : 0);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {inv.model?.photoUrl && (
                                <AvatarImage src={inv.model.photoUrl} alt={inv.model.stageName} />
                              )}
                              <AvatarFallback className="text-xs">
                                {inv.model?.stageName?.slice(0, 2).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{inv.model?.stageName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{fmt(inv.grossRevenue)}</TableCell>
                        <TableCell className="text-right">{modelPct}%</TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {fmt(inv.amountDue)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {fmt(inv.agencyShare)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={inv.status}
                            onValueChange={(v) => handleInvoiceStatusChange(inv.id, v)}
                          >
                            <SelectTrigger className="w-[130px] h-8 px-2">
                              <Badge
                                className={cn(
                                  "text-xs font-medium cursor-pointer",
                                  STATUS_STYLE[inv.status]
                                )}
                                variant="secondary"
                              >
                                {STATUS_LABEL[inv.status]}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DRAFT">Brouillon</SelectItem>
                              <SelectItem value="SENT">Envoyée</SelectItem>
                              <SelectItem value="PAID">Payée</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" disabled>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Payroll Section */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Payroll chatters</h2>
          <Separator className="flex-1" />
        </div>

        <div className="mb-4">
          <Button onClick={handleGeneratePayroll} disabled={genPayrollLoading}>
            {genPayrollLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Calculer le payroll
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chatter</TableHead>
                  <TableHead className="text-right">Heures</TableHead>
                  <TableHead className="text-right">Taux/h</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Tips/Msg</TableHead>
                  <TableHead className="text-right">% comm</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : payrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Aucun payroll pour cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  payrolls.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="font-medium">{p.chatter?.name}</span>
                      </TableCell>
                      <TableCell className="text-right">{p.hoursWorked}h</TableCell>
                      <TableCell className="text-right">{fmt(p.hourlyRate)}</TableCell>
                      <TableCell className="text-right">{fmt(p.basePay)}</TableCell>
                      <TableCell className="text-right">
                        {fmt((p.tipsRevenue || 0) + (p.messagesRevenue || 0))}
                      </TableCell>
                      <TableCell className="text-right">{p.commissionRate}%</TableCell>
                      <TableCell className="text-right font-medium text-violet-600">
                        {fmt(p.commissionAmount)}
                      </TableCell>
                      <TableCell className="text-right font-bold">{fmt(p.totalPay)}</TableCell>
                      <TableCell>
                        <Select
                          value={p.status}
                          onValueChange={(v) => handlePayrollStatusChange(p.id, v)}
                        >
                          <SelectTrigger className="w-[130px] h-8 px-2">
                            <Badge
                              className={cn(
                                "text-xs font-medium cursor-pointer",
                                STATUS_STYLE[p.status]
                              )}
                              variant="secondary"
                            >
                              {STATUS_LABEL[p.status]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Brouillon</SelectItem>
                            <SelectItem value="SENT">Envoyé</SelectItem>
                            <SelectItem value="PAID">Payé</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
