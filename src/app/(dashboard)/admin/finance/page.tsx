"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  Check,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, lastDayOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

/* ========== Types ========== */

type TabId = "overview" | "import" | "invoices" | "payroll";

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
  model: { id: string; stageName: string; photoUrl?: string };
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  ofCutPercent: number;
  ofFees: number;
  netAfterOF: number;
  modelSharePercent: number;
  netRevenue: number;
  agencyShare: number;
  amountDue: number;
  subsRevenue: number;
  tipsRevenue: number;
  messagesRevenue: number;
  postsRevenue: number;
  streamsRevenue: number;
  referralsRevenue: number;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
}

interface Payroll {
  id: string;
  chatterId: string;
  chatter: { id: string; name: string; avatar?: string };
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  hourlyRate: number;
  baseSalary: number;
  tipsMessagesGenerated: number;
  commissionPercent: number;
  commissionAmount: number;
  adjustmentsTotal: number;
  totalPay: number;
  status: string;
}

interface PayrollAdjustment {
  id: string;
  description: string;
  amount: number;
  addedBy: string;
  createdAt: string;
}

interface ImportLogEntry {
  id: string;
  type: string;
  fileName: string;
  modelId?: string;
  model?: { id: string; stageName: string; photoUrl?: string };
  chatterId?: string;
  chatter?: { id: string; name: string };
  periodStart?: string;
  periodEnd?: string;
  totalRows: number;
  imported: number;
  skipped: number;
  totalAmount?: number;
  importedBy: string;
  importedByUser?: { id: string; name: string };
  createdAt: string;
}

interface ClockDetail {
  id: string;
  shiftDate: string;
  shiftType: string;
  clockIn: string;
  clockOut: string | null;
  source: string;
}

interface ChatterDailyDetail {
  date: string;
  model: { stageName: string };
  tipsGross: number;
  messagesGross: number;
  totalGross: number;
}

/* ========== Helpers ========== */

function generatePeriods(): Period[] {
  const periods: Period[] = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  for (let i = 0; i < 12; i++) {
    const secondStart = new Date(year, month, 16);
    const secondEnd = lastDayOfMonth(new Date(year, month, 1));
    periods.push({
      label: `16 - ${secondEnd.getDate()} ${format(secondStart, "MMMM yyyy", { locale: fr })}`,
      start: secondStart,
      end: secondEnd,
    });

    const firstStart = new Date(year, month, 1);
    const firstEnd = new Date(year, month, 15);
    periods.push({
      label: `1 - 15 ${format(firstStart, "MMMM yyyy", { locale: fr })}`,
      start: firstStart,
      end: firstEnd,
    });

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
  return `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h`;
}

function trendPct(current: number, previous: number): number | null {
  if (!previous || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  VALIDATED: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyée",
  PAID: "Payée",
  OVERDUE: "En retard",
  VALIDATED: "Validé",
};

const INVOICE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["PAID", "OVERDUE"],
  PAID: ["SENT"],
  OVERDUE: ["PAID", "SENT"],
};

const PAYROLL_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["VALIDATED"],
  VALIDATED: ["PAID", "DRAFT"],
  PAID: [],
};

/* ========== Component ========== */

export default function AdminFinancePage() {
  const { toast } = useToast();

  // Tab
  const [activeTab, setActiveTab] = useState<TabId>("overview");

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
  const [importLogs, setImportLogs] = useState<ImportLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodIncomplete, setPeriodIncomplete] = useState(false);

  // Trends
  const [previousTotals, setPreviousTotals] = useState<{
    gross: number;
    modelNet: number;
    agencyNet: number;
  } | null>(null);

  // Import states
  const [importLoading, setImportLoading] = useState(false);
  const [importModelId, setImportModelId] = useState("");
  const [importChatterModelId, setImportChatterModelId] = useState("");
  const [importChatterId, setImportChatterId] = useState("");
  const modelFileRef = useRef<HTMLInputElement>(null);
  const chatterFileRef = useRef<HTMLInputElement>(null);
  const [modelFileName, setModelFileName] = useState("");
  const [chatterFileName, setChatterFileName] = useState("");
  const [modelDragOver, setModelDragOver] = useState(false);
  const [chatterDragOver, setChatterDragOver] = useState(false);

  // Generate loading
  const [genInvoicesLoading, setGenInvoicesLoading] = useState(false);
  const [genPayrollLoading, setGenPayrollLoading] = useState(false);

  // Selection
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Payroll expand
  const [expandedPayroll, setExpandedPayroll] = useState<string | null>(null);
  const [payrollClocks, setPayrollClocks] = useState<ClockDetail[]>([]);
  const [payrollDaily, setPayrollDaily] = useState<ChatterDailyDetail[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<PayrollAdjustment[]>([]);
  const [expandLoading, setExpandLoading] = useState(false);

  // Adjustment dialog
  const [adjDialogOpen, setAdjDialogOpen] = useState(false);
  const [adjPayrollId, setAdjPayrollId] = useState("");
  const [adjDescription, setAdjDescription] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjLoading, setAdjLoading] = useState(false);

  /* --- Fetch reference data --- */
  useEffect(() => {
    async function fetchRefs() {
      try {
        const [modelsRes, chattersRes] = await Promise.all([
          fetch("/api/models?limit=100"),
          fetch("/api/chatters"),
        ]);
        const modelsJson = await modelsRes.json();
        const chattersJson = await chattersRes.json();

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

        if (chattersJson?.data) {
          const list = Array.isArray(chattersJson.data) ? chattersJson.data : [];
          setChatters(
            list.map(
              (c: { user: { id: string; name: string }; id: string }) => ({
                id: c.user.id,
                name: c.user.name,
              })
            )
          );
        }
      } catch {
        // silent
      }
    }
    fetchRefs();
  }, []);

  /* --- Fetch period data --- */
  const fetchPeriodData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodStart: selectedPeriod.start.toISOString(),
        periodEnd: selectedPeriod.end.toISOString(),
      });
      const [invRes, payRes, impRes] = await Promise.all([
        fetch(`/api/finance/invoices?${params}`),
        fetch(`/api/finance/payroll?periodStart=${selectedPeriod.start.toISOString()}`),
        fetch("/api/finance/imports?limit=20"),
      ]);
      const invJson = await invRes.json();
      const payJson = await payRes.json();
      const impJson = await impRes.json();

      if (invJson?.data) {
        setInvoices(invJson.data.invoices || []);
        setPreviousTotals(invJson.data.previousTotals || null);
        setPeriodIncomplete(invJson.data.periodIncomplete || false);
      }
      if (payJson?.data) {
        setPayrolls(Array.isArray(payJson.data) ? payJson.data : []);
      }
      if (impJson?.data) {
        setImportLogs(Array.isArray(impJson.data) ? impJson.data : []);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données.",
        variant: "destructive",
      });
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

  const trendGross = previousTotals ? trendPct(kpiGross, previousTotals.gross) : null;
  const trendAgency = previousTotals ? trendPct(kpiAgency, previousTotals.agencyNet) : null;
  const trendModels = previousTotals ? trendPct(kpiModels, previousTotals.modelNet) : null;

  /* --- Stepper --- */
  const hasImports = importLogs.length > 0;
  const hasInvoices = invoices.length > 0;
  const allSent = hasInvoices && invoices.every((i) => i.status !== "DRAFT");
  const allPaid = hasInvoices && invoices.every((i) => i.status === "PAID");

  const steps = [
    { label: "Importer", done: hasImports, tab: "import" as TabId },
    { label: "Générer factures", done: hasInvoices, tab: "invoices" as TabId },
    { label: "Envoyer", done: allSent, partial: hasInvoices && !allSent, tab: "invoices" as TabId },
    { label: "Marquer payé", done: allPaid, partial: hasInvoices && !allPaid && allSent, tab: "invoices" as TabId },
  ];

  /* --- Import handlers --- */
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
        const d = json?.data || {};
        toast({ title: "Import réussi", description: `${d.imported || 0} lignes importées.` });
        if (modelFileRef.current) modelFileRef.current.value = "";
        setModelFileName("");
        fetchPeriodData();
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur lors de l'import.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de l'import.", variant: "destructive" });
    }
    setImportLoading(false);
  }

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
        const d = json?.data || {};
        toast({ title: "Import réussi", description: `${d.imported || 0} lignes importées.` });
        if (chatterFileRef.current) chatterFileRef.current.value = "";
        setChatterFileName("");
        fetchPeriodData();
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur lors de l'import.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de l'import.", variant: "destructive" });
    }
    setImportLoading(false);
  }

  /* --- Generate handlers --- */
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
        const d = json?.data || {};
        let msg = `${d.generated || 0} factures générées.`;
        if (d.skipped > 0) msg += ` ${d.skipped} ignorées (déjà envoyées/payées).`;
        toast({ title: "Succès", description: msg });
        fetchPeriodData();
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur lors de la génération.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur lors de la génération.", variant: "destructive" });
    }
    setGenInvoicesLoading(false);
  }

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
        const d = json?.data || {};
        let msg = `${d.generated || 0} payrolls calculés.`;
        if (d.skipped > 0) msg += ` ${d.skipped} ignorés (déjà validés/payés).`;
        toast({ title: "Succès", description: msg });
        fetchPeriodData();
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur lors du calcul.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur lors du calcul.", variant: "destructive" });
    }
    setGenPayrollLoading(false);
  }

  /* --- Status change handlers --- */
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
            inv.id === invoiceId
              ? { ...inv, status: newStatus as Invoice["status"] }
              : inv
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
            p.id === payrollId ? { ...p, status: newStatus } : p
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

  /* --- Bulk actions --- */
  async function handleBulkInvoiceStatus(newStatus: string) {
    const ids = Array.from(selectedInvoices);
    for (const id of ids) {
      await handleInvoiceStatusChange(id, newStatus);
    }
    setSelectedInvoices(new Set());
  }

  function toggleInvoiceSelection(id: string) {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllInvoices() {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map((i) => i.id)));
    }
  }

  /* --- Payroll expand --- */
  async function togglePayrollExpand(payroll: Payroll) {
    if (expandedPayroll === payroll.id) {
      setExpandedPayroll(null);
      return;
    }
    setExpandedPayroll(payroll.id);
    setExpandLoading(true);
    try {
      const [adjRes] = await Promise.all([
        fetch(`/api/finance/payroll/${payroll.id}/adjustments`),
      ]);
      const adjJson = await adjRes.json();
      setPayrollAdjustments(adjJson?.data || []);

      // Fetch clock details and daily data
      const start = selectedPeriod.start.toISOString();
      const end = selectedPeriod.end.toISOString();
      const [clockRes, dailyRes] = await Promise.all([
        fetch(`/api/clock?chatterId=${payroll.chatterId}&from=${start}&to=${end}`),
        fetch(`/api/finance/payroll/${payroll.id}/daily?from=${start}&to=${end}`),
      ]);
      const clockJson = await clockRes.json();
      const dailyJson = await dailyRes.json();
      setPayrollClocks(clockJson?.data || []);
      setPayrollDaily(dailyJson?.data || []);
    } catch {
      // Some endpoints may not exist yet
      setPayrollClocks([]);
      setPayrollDaily([]);
    }
    setExpandLoading(false);
  }

  /* --- Adjustment handlers --- */
  async function handleAddAdjustment() {
    if (!adjDescription || !adjAmount || !adjPayrollId) return;
    setAdjLoading(true);
    try {
      const res = await fetch(`/api/finance/payroll/${adjPayrollId}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: adjDescription, amount: parseFloat(adjAmount) }),
      });
      const json = await res.json();
      if (json?.success || res.ok) {
        toast({ title: "Ajustement ajouté" });
        setAdjDialogOpen(false);
        setAdjDescription("");
        setAdjAmount("");
        fetchPeriodData();
        // Refresh adjustments
        const adjRes = await fetch(`/api/finance/payroll/${adjPayrollId}/adjustments`);
        const adjJson = await adjRes.json();
        setPayrollAdjustments(adjJson?.data || []);
      } else {
        toast({ title: "Erreur", description: json?.error || "Erreur.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur.", variant: "destructive" });
    }
    setAdjLoading(false);
  }

  async function handleDeleteAdjustment(adjustmentId: string) {
    try {
      const res = await fetch(`/api/finance/payroll/adjustments/${adjustmentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json?.success || res.ok) {
        toast({ title: "Ajustement supprimé" });
        setPayrollAdjustments((prev) => prev.filter((a) => a.id !== adjustmentId));
        fetchPeriodData();
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  }

  /* --- Delete import --- */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDeleteImport(logId: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/finance/imports/${logId}`, { method: "DELETE" });
      const json = await res.json();
      if (json?.success || res.ok) {
        const d = json?.data || {};
        let msg = `Import supprimé — ${d.deletedRows || 0} lignes retirées.`;
        if (d.warnings?.length) msg += ` ${d.warnings.join(" ")}`;
        toast({ title: "Succès", description: msg });
        setImportLogs((prev) => prev.filter((l) => l.id !== logId));
        setDeleteConfirmId(null);
      } else {
        toast({ title: "Erreur", description: json?.error || "Impossible de supprimer.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
    setDeleteLoading(false);
  }

  /* --- Replace import --- */
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const [replaceLogId, setReplaceLogId] = useState<string | null>(null);
  const [replaceLoading, setReplaceLoading] = useState(false);

  async function handleReplaceImport(log: ImportLogEntry) {
    const file = replaceFileRef.current?.files?.[0];
    if (!file) return;
    setReplaceLoading(true);
    try {
      // First delete old data
      await fetch(`/api/finance/imports/${log.id}`, { method: "DELETE" });

      // Then import new data
      const fd = new FormData();
      fd.append("file", file);
      if (log.type === "MODEL" && log.modelId) {
        fd.append("modelId", log.modelId);
        const res = await fetch("/api/finance/import/model", { method: "POST", body: fd });
        const json = await res.json();
        if (json?.success || res.ok) {
          toast({ title: "Import remplacé", description: `${json?.data?.imported || 0} lignes mises à jour.` });
        } else {
          toast({ title: "Erreur", description: json?.error || "Erreur.", variant: "destructive" });
        }
      } else if (log.type === "CHATTER" && log.chatterId && log.modelId) {
        fd.append("chatterId", log.chatterId);
        fd.append("modelId", log.modelId);
        const res = await fetch("/api/finance/import/chatter", { method: "POST", body: fd });
        const json = await res.json();
        if (json?.success || res.ok) {
          toast({ title: "Import remplacé", description: `${json?.data?.imported || 0} lignes mises à jour.` });
        } else {
          toast({ title: "Erreur", description: json?.error || "Erreur.", variant: "destructive" });
        }
      }
      if (replaceFileRef.current) replaceFileRef.current.value = "";
      setReplaceLogId(null);
      fetchPeriodData();
    } catch {
      toast({ title: "Erreur", description: "Erreur lors du remplacement.", variant: "destructive" });
    }
    setReplaceLoading(false);
  }

  /* --- PDF download --- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function downloadPDF(inv: any) {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const f = (n: number) => `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const pStart = inv.periodStart ? format(new Date(inv.periodStart), "d MMM yyyy", { locale: fr }) : "";
    const pEnd = inv.periodEnd ? format(new Date(inv.periodEnd), "d MMM yyyy", { locale: fr }) : "";

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("EXCLSV", 20, 25);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Recapitulatif", 20, 35);

    // Info
    doc.setFontSize(10);
    doc.text(`Model : ${inv.model?.stageName || ""}`, 20, 50);
    doc.text(`Period : ${pStart} - ${pEnd}`, 20, 57);
    doc.text(`Date : ${format(new Date(), "d MMM yyyy", { locale: fr })}`, 20, 64);
    doc.text(`Ref : EXCLSV-${format(new Date(inv.periodStart), "yyyy-MM")}-${String(inv.id).slice(-3).toUpperCase()}`, 20, 71);

    // Breakdown table
    let y = 86;
    doc.setFont("helvetica", "bold");
    doc.text("Category", 20, y);
    doc.text("Amount", 170, y, { align: "right" });
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    doc.setFont("helvetica", "normal");
    const rows: [string, string][] = [
      ["Subscriptions", f(inv.subsRevenue)],
      ["Tips", f(inv.tipsRevenue)],
      ["Messages", f(inv.messagesRevenue)],
      ["Posts", f(inv.postsRevenue)],
      ["Streams", f(inv.streamsRevenue)],
      ["Referrals", f(inv.referralsRevenue)],
    ];
    for (const [label, val] of rows) {
      doc.text(label, 20, y);
      doc.text(val, 170, y, { align: "right" });
      y += 7;
    }

    doc.line(20, y, 190, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Gross Revenue", 20, y);
    doc.text(f(inv.grossRevenue), 170, y, { align: "right" });
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.text(`OnlyFans Commission (${inv.ofCutPercent ?? 20}%)`, 20, y);
    doc.text(`-${f(inv.ofFees)}`, 170, y, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Net after OF", 20, y);
    doc.text(f(inv.netAfterOF ?? inv.netRevenue), 170, y, { align: "right" });
    y += 12;

    doc.setFont("helvetica", "normal");
    const modelPct = inv.modelSharePercent ?? 50;
    doc.text(`Model share (${modelPct}%)`, 20, y);
    doc.text(f(inv.amountDue), 170, y, { align: "right" });
    y += 7;
    doc.text(`Agency share (${100 - modelPct}%)`, 20, y);
    doc.text(f(inv.agencyShare), 170, y, { align: "right" });
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AMOUNT TO PAY:", 20, y);
    doc.text(f(inv.agencyShare), 170, y, { align: "right" });

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Document generated by EXCLSV CRM", 20, 280);

    doc.save(`recapitulatif_${inv.model?.stageName || "model"}_${pStart.replace(/ /g, "_")}.pdf`);
  }

  /* --- Drag & Drop helpers --- */
  function handleDrop(
    e: React.DragEvent,
    fileRef: React.RefObject<HTMLInputElement | null>,
    setFileName: (name: string) => void
  ) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
      setFileName(file.name);
    }
  }

  /* --- Bulk action helpers --- */
  const selectedInvoicesList = invoices.filter((i) => selectedInvoices.has(i.id));
  const allSelectedDraft = selectedInvoicesList.length > 0 && selectedInvoicesList.every((i) => i.status === "DRAFT");
  const allSelectedSent = selectedInvoicesList.length > 0 && selectedInvoicesList.every((i) => i.status === "SENT");

  /* ========== RENDER ========== */

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "import", label: "Import données" },
    { id: "invoices", label: "Factures modèles" },
    { id: "payroll", label: "Payroll chatters" },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header with tabs and period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Factures, payroll et imports de données
          </p>
        </div>
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

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-lg",
              activeTab === tab.id && "bg-foreground text-background hover:bg-foreground/90"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Period incomplete warning */}
      {periodIncomplete && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 py-2 px-4">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Cette période est en cours (se termine le{" "}
            {format(selectedPeriod.end, "d MMMM yyyy", { locale: fr })}).
            Les données sont partielles.
          </p>
        </div>
      )}

      {/* ===================== TAB: OVERVIEW ===================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-0">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center">
                <button
                  onClick={() => setActiveTab(step.tab)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      step.done
                        ? "bg-green-500 text-white"
                        : step.partial
                          ? "bg-amber-400 text-white"
                          : "bg-gray-200 text-gray-500 group-hover:bg-gray-300"
                    )}
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">
                    {step.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-12 mx-2 mt-[-18px]",
                      step.done ? "bg-green-500" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "CA Brut", value: kpiGross, trend: trendGross, icon: DollarSign, color: "gray" },
              { label: "À percevoir", value: kpiAgency, trend: trendAgency, icon: Building2, color: "green" },
              { label: "Part modèles", value: kpiModels, trend: trendModels, icon: Users, color: "blue" },
              { label: "Masse Salariale", value: kpiPayroll, trend: null, icon: Wallet, color: "violet" },
            ].map((kpi, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      `bg-${kpi.color}-100`
                    )}
                    style={{
                      backgroundColor:
                        kpi.color === "gray" ? "#f3f4f6" :
                        kpi.color === "green" ? "#dcfce7" :
                        kpi.color === "blue" ? "#dbeafe" :
                        "#ede9fe",
                    }}
                  >
                    <kpi.icon
                      className="h-5 w-5"
                      style={{
                        color:
                          kpi.color === "gray" ? "#4b5563" :
                          kpi.color === "green" ? "#16a34a" :
                          kpi.color === "blue" ? "#2563eb" :
                          "#7c3aed",
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p
                      className="text-2xl font-bold"
                      style={{
                        color:
                          kpi.color === "gray" ? undefined :
                          kpi.color === "green" ? "#16a34a" :
                          kpi.color === "blue" ? "#2563eb" :
                          "#7c3aed",
                      }}
                    >
                      {fmt(kpi.value)}
                    </p>
                    {kpi.trend !== null && (
                      <p
                        className={cn(
                          "flex items-center gap-0.5 text-xs mt-0.5",
                          kpi.trend >= 0 ? "text-green-600" : "text-red-500"
                        )}
                      >
                        {kpi.trend >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {kpi.trend >= 0 ? "+" : ""}
                        {kpi.trend}% vs période préc.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Model summary table */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Répartition par modèle</h2>
              <Separator className="flex-1" />
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modèle</TableHead>
                    <TableHead className="text-right">CA brut</TableHead>
                    <TableHead className="text-right">Part modèle</TableHead>
                    <TableHead className="text-right">À percevoir</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucune facture pour cette période
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setActiveTab("invoices")}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-7 w-7">
                              {inv.model?.photoUrl && <AvatarImage src={inv.model.photoUrl} />}
                              <AvatarFallback className="text-xs">
                                {inv.model?.stageName?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{inv.model?.stageName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{fmt(inv.grossRevenue)}</TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">{fmt(inv.amountDue)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{fmt(inv.agencyShare)}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", STATUS_STYLE[inv.status])} variant="secondary">
                            {STATUS_LABEL[inv.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Payroll summary */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Résumé payroll</h2>
              <Separator className="flex-1" />
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chatter</TableHead>
                    <TableHead className="text-right">Heures</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun payroll pour cette période
                      </TableCell>
                    </TableRow>
                  ) : (
                    payrolls.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setActiveTab("payroll")}
                      >
                        <TableCell className="font-medium text-sm">{p.chatter?.name}</TableCell>
                        <TableCell className="text-right">{fmtHours(p.totalHours)}</TableCell>
                        <TableCell className="text-right font-bold">{fmt(p.totalPay)}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", STATUS_STYLE[p.status])} variant="secondary">
                            {STATUS_LABEL[p.status] || p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {/* ===================== TAB: IMPORT ===================== */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Étape 1/4 — Importez les données Infloww
          </p>

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

                {/* Drag & drop zone */}
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 px-4 transition-colors cursor-pointer",
                    modelDragOver
                      ? "border-blue-400 bg-blue-50"
                      : modelFileName
                        ? "border-green-400 bg-green-50"
                        : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setModelDragOver(true);
                  }}
                  onDragLeave={() => setModelDragOver(false)}
                  onDrop={(e) => {
                    setModelDragOver(false);
                    handleDrop(e, modelFileRef, setModelFileName);
                  }}
                  onClick={() => modelFileRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  {modelFileName ? (
                    <p className="text-sm font-medium text-green-700">{modelFileName}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Glissez un fichier .xlsx ou cliquez pour sélectionner
                    </p>
                  )}
                  <Input
                    ref={modelFileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) =>
                      setModelFileName(e.target.files?.[0]?.name || "")
                    }
                  />
                </div>

                <Button
                  onClick={handleImportModel}
                  disabled={importLoading || !importModelId || !modelFileName}
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
                  <Select
                    value={importChatterModelId}
                    onValueChange={setImportChatterModelId}
                  >
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

                {/* Drag & drop zone */}
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 px-4 transition-colors cursor-pointer",
                    chatterDragOver
                      ? "border-blue-400 bg-blue-50"
                      : chatterFileName
                        ? "border-green-400 bg-green-50"
                        : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setChatterDragOver(true);
                  }}
                  onDragLeave={() => setChatterDragOver(false)}
                  onDrop={(e) => {
                    setChatterDragOver(false);
                    handleDrop(e, chatterFileRef, setChatterFileName);
                  }}
                  onClick={() => chatterFileRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  {chatterFileName ? (
                    <p className="text-sm font-medium text-green-700">{chatterFileName}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Glissez un fichier .xlsx ou cliquez pour sélectionner
                    </p>
                  )}
                  <Input
                    ref={chatterFileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) =>
                      setChatterFileName(e.target.files?.[0]?.name || "")
                    }
                  />
                </div>

                <Button
                  onClick={handleImportChatter}
                  disabled={
                    importLoading ||
                    !importChatterId ||
                    !importChatterModelId ||
                    !chatterFileName
                  }
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

          {/* Import history */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Historique des imports</h2>
              <Separator className="flex-1" />
            </div>
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead className="text-right">Lignes</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Par</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Aucun import
                        </TableCell>
                      </TableRow>
                    ) : (
                      importLogs.slice(0, 10).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(log.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-xs",
                                log.type === "MODEL"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-purple-50 text-purple-700"
                              )}
                              variant="secondary"
                            >
                              {log.type === "MODEL" ? "Modèle" : "Chatter"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.type === "MODEL" && log.model ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  {log.model.photoUrl && <AvatarImage src={log.model.photoUrl} />}
                                  <AvatarFallback className="text-[9px]">
                                    {log.model.stageName?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{log.model.stageName}</span>
                              </div>
                            ) : log.type === "CHATTER" ? (
                              <span className="text-sm">
                                {log.chatter?.name || "—"}
                                {log.model ? ` → ${log.model.stageName}` : ""}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell
                            className="text-sm max-w-[160px] truncate"
                            title={log.fileName}
                          >
                            {log.fileName}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {log.periodStart && log.periodEnd
                              ? `${format(new Date(log.periodStart), "d", { locale: fr })}-${format(new Date(log.periodEnd), "d MMM yyyy", { locale: fr })}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600 font-medium">{log.imported}</span>
                            {log.skipped > 0 && (
                              <span className="text-red-500 ml-1">/ {log.skipped} ign.</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {log.totalAmount ? fmt(log.totalAmount) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.importedByUser?.name || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Replace button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
                                title="Remplacer"
                                onClick={() => {
                                  setReplaceLogId(log.id);
                                  setTimeout(() => replaceFileRef.current?.click(), 100);
                                }}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                              {/* Delete button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                                title="Supprimer"
                                onClick={() => setDeleteConfirmId(log.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Hidden file input for replace */}
            <Input
              ref={replaceFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={() => {
                const log = importLogs.find((l) => l.id === replaceLogId);
                if (log) handleReplaceImport(log);
              }}
            />

            {/* Delete confirmation dialog */}
            <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Supprimer cet import ?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Toutes les données importées (lignes de revenus) pour cette période seront supprimées.
                  Les factures et payrolls existants devront être regénérés.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteConfirmId && handleDeleteImport(deleteConfirmId)}
                    disabled={deleteLoading}
                  >
                    {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Supprimer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* ===================== TAB: INVOICES ===================== */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Header buttons */}
          <div className="flex items-center gap-3">
            <Button onClick={handleGenerateInvoices} disabled={genInvoicesLoading}>
              {genInvoicesLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Générer les factures
            </Button>
            {invoices.some((i) => i.status === "DRAFT") && (
              <Button
                variant="outline"
                onClick={() => {
                  const draftIds = invoices
                    .filter((i) => i.status === "DRAFT")
                    .map((i) => i.id);
                  setSelectedInvoices(new Set(draftIds));
                  handleBulkInvoiceStatus("SENT");
                }}
              >
                Tout envoyer
              </Button>
            )}
            {invoices.some((i) => i.status === "SENT") && (
              <Button
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => {
                  const sentIds = invoices
                    .filter((i) => i.status === "SENT")
                    .map((i) => i.id);
                  setSelectedInvoices(new Set(sentIds));
                  handleBulkInvoiceStatus("PAID");
                }}
              >
                Tout marquer payé
              </Button>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedInvoices.size > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 py-2 px-4">
              <span className="text-sm font-medium text-blue-700">
                {selectedInvoices.size} facture{selectedInvoices.size > 1 ? "s" : ""} sélectionnée{selectedInvoices.size > 1 ? "s" : ""}
              </span>
              {allSelectedDraft && (
                <Button size="sm" variant="outline" onClick={() => handleBulkInvoiceStatus("SENT")}>
                  Passer en Envoyé
                </Button>
              )}
              {allSelectedSent && (
                <Button size="sm" variant="outline" onClick={() => handleBulkInvoiceStatus("PAID")}>
                  Passer en Payé
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedInvoices(new Set())}
              >
                Annuler
              </Button>
            </div>
          )}

          {/* Invoice table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={invoices.length > 0 && selectedInvoices.size === invoices.length}
                        onCheckedChange={toggleAllInvoices}
                      />
                    </TableHead>
                    <TableHead>Modèle</TableHead>
                    <TableHead className="text-right">CA brut</TableHead>
                    <TableHead className="text-right">Com. OF</TableHead>
                    <TableHead className="text-right">Net OF</TableHead>
                    <TableHead className="text-right">% modèle</TableHead>
                    <TableHead className="text-right">Part modèle</TableHead>
                    <TableHead className="text-right">À percevoir</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Aucune facture pour cette période
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedInvoices.has(inv.id)}
                              onCheckedChange={() => toggleInvoiceSelection(inv.id)}
                            />
                          </TableCell>
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
                          <TableCell className="text-right text-muted-foreground">
                            {inv.ofCutPercent}%
                          </TableCell>
                          <TableCell className="text-right">{fmt(inv.netAfterOF)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {inv.modelSharePercent}%
                          </TableCell>
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
                              <SelectTrigger className="w-[120px] h-8 px-2">
                                <Badge
                                  className={cn("text-xs font-medium cursor-pointer", STATUS_STYLE[inv.status])}
                                  variant="secondary"
                                >
                                  {STATUS_LABEL[inv.status]}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {(INVOICE_TRANSITIONS[inv.status] || []).map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {STATUS_LABEL[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => downloadPDF(inv)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-gray-50 font-bold">
                        <TableCell />
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{fmt(kpiGross)}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          {fmt(invoices.reduce((s, i) => s + (i.netAfterOF ?? 0), 0))}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right text-blue-600">{fmt(kpiModels)}</TableCell>
                        <TableCell className="text-right text-green-600">{fmt(kpiAgency)}</TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ===================== TAB: PAYROLL ===================== */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button onClick={handleGeneratePayroll} disabled={genPayrollLoading}>
              {genPayrollLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              {payrolls.length > 0 ? "Recalculer le payroll" : "Calculer le payroll"}
            </Button>
          </div>

          {/* Payroll table */}
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
                    <TableHead className="text-right">% comm.</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Ajustements</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : payrolls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Aucun payroll pour cette période
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {payrolls.map((p) => (
                        <>
                          <TableRow key={p.id} className="group">
                            <TableCell className="font-medium">{p.chatter?.name}</TableCell>
                            <TableCell className="text-right">{fmtHours(p.totalHours)}</TableCell>
                            <TableCell className="text-right">${p.hourlyRate}/h</TableCell>
                            <TableCell className="text-right">{fmt(p.baseSalary)}</TableCell>
                            <TableCell className="text-right">{fmt(p.tipsMessagesGenerated)}</TableCell>
                            <TableCell className="text-right">{p.commissionPercent}%</TableCell>
                            <TableCell className="text-right font-medium text-violet-600">
                              {fmt(p.commissionAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.adjustmentsTotal !== 0 ? (
                                <span
                                  className={cn(
                                    "font-medium",
                                    p.adjustmentsTotal > 0 ? "text-green-600" : "text-red-500"
                                  )}
                                >
                                  {p.adjustmentsTotal > 0 ? "+" : ""}
                                  {fmt(p.adjustmentsTotal)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold">{fmt(p.totalPay)}</TableCell>
                            <TableCell>
                              <Select
                                value={p.status}
                                onValueChange={(v) => handlePayrollStatusChange(p.id, v)}
                              >
                                <SelectTrigger className="w-[120px] h-8 px-2">
                                  <Badge
                                    className={cn("text-xs font-medium cursor-pointer", STATUS_STYLE[p.status])}
                                    variant="secondary"
                                  >
                                    {STATUS_LABEL[p.status] || p.status}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {(PAYROLL_TRANSITIONS[p.status] || []).map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {STATUS_LABEL[s] || s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePayrollExpand(p)}
                              >
                                {expandedPayroll === p.id ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded detail */}
                          {expandedPayroll === p.id && (
                            <TableRow>
                              <TableCell colSpan={11} className="bg-gray-50 p-0">
                                <div className="p-4 space-y-4 border-t border-gray-100">
                                  {expandLoading ? (
                                    <div className="flex justify-center py-4">
                                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                  ) : (
                                    <>
                                      {/* Clock details */}
                                      {payrollClocks.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-semibold mb-2">Détail heures</h4>
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Shift</TableHead>
                                                <TableHead>Clock-in</TableHead>
                                                <TableHead>Clock-out</TableHead>
                                                <TableHead>Source</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {payrollClocks.map((c) => (
                                                <TableRow key={c.id}>
                                                  <TableCell className="text-xs">
                                                    {format(new Date(c.shiftDate), "d MMM", { locale: fr })}
                                                  </TableCell>
                                                  <TableCell className="text-xs">{c.shiftType}</TableCell>
                                                  <TableCell className="text-xs">
                                                    {format(new Date(c.clockIn), "HH:mm")}
                                                  </TableCell>
                                                  <TableCell className="text-xs">
                                                    {c.clockOut ? format(new Date(c.clockOut), "HH:mm") : "—"}
                                                  </TableCell>
                                                  <TableCell className="text-xs">{c.source}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      )}

                                      {/* Daily commission details */}
                                      {payrollDaily.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-semibold mb-2">Détail commission</h4>
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Modèle</TableHead>
                                                <TableHead className="text-right">Tips</TableHead>
                                                <TableHead className="text-right">Messages</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {payrollDaily.map((d, i) => (
                                                <TableRow key={i}>
                                                  <TableCell className="text-xs">
                                                    {format(new Date(d.date), "d MMM", { locale: fr })}
                                                  </TableCell>
                                                  <TableCell className="text-xs">{d.model?.stageName}</TableCell>
                                                  <TableCell className="text-right text-xs">{fmt(d.tipsGross)}</TableCell>
                                                  <TableCell className="text-right text-xs">{fmt(d.messagesGross)}</TableCell>
                                                  <TableCell className="text-right text-xs font-medium">{fmt(d.totalGross)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      )}

                                      {/* Adjustments */}
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="text-sm font-semibold">Ajustements</h4>
                                          {p.status === "DRAFT" && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setAdjPayrollId(p.id);
                                                setAdjDialogOpen(true);
                                              }}
                                            >
                                              <Plus className="h-3 w-3 mr-1" />
                                              Ajouter
                                            </Button>
                                          )}
                                        </div>
                                        {payrollAdjustments.length === 0 ? (
                                          <p className="text-xs text-muted-foreground">Aucun ajustement</p>
                                        ) : (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Montant</TableHead>
                                                <TableHead className="w-[40px]" />
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {payrollAdjustments.map((adj) => (
                                                <TableRow key={adj.id}>
                                                  <TableCell className="text-xs">{adj.description}</TableCell>
                                                  <TableCell
                                                    className={cn(
                                                      "text-right text-xs font-medium",
                                                      adj.amount >= 0 ? "text-green-600" : "text-red-500"
                                                    )}
                                                  >
                                                    {adj.amount >= 0 ? "+" : ""}
                                                    {fmt(adj.amount)}
                                                  </TableCell>
                                                  <TableCell>
                                                    {p.status === "DRAFT" && (
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteAdjustment(adj.id)}
                                                      >
                                                        <Trash2 className="h-3 w-3 text-red-400" />
                                                      </Button>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}

                      {/* Totals row */}
                      <TableRow className="bg-gray-50 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">
                          {fmtHours(payrolls.reduce((s, p) => s + p.totalHours, 0))}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          {fmt(payrolls.reduce((s, p) => s + p.baseSalary, 0))}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right text-violet-600">
                          {fmt(payrolls.reduce((s, p) => s + p.commissionAmount, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(payrolls.reduce((s, p) => s + p.adjustmentsTotal, 0))}
                        </TableCell>
                        <TableCell className="text-right">{fmt(kpiPayroll)}</TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* Adjustment Dialog */}
      <Dialog open={adjDialogOpen} onOpenChange={setAdjDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un ajustement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Ex: Bonus performance"
                value={adjDescription}
                onChange={(e) => setAdjDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Montant (positif = bonus, négatif = déduction)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 200 ou -50"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddAdjustment}
              disabled={adjLoading || !adjDescription || !adjAmount}
            >
              {adjLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
