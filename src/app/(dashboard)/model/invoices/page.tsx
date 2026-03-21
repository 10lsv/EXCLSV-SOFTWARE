"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ---------- Types ---------- */

interface Invoice {
  id: string;
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  ofCutPercent: number;
  ofFees: number;
  netAfterOF: number;
  modelSharePercent: number;
  amountDue: number;
  agencyShare: number;
  subsRevenue: number;
  tipsRevenue: number;
  messagesRevenue: number;
  postsRevenue: number;
  streamsRevenue: number;
  referralsRevenue: number;
  status: "SENT" | "PAID";
}

interface DailyRow {
  date: string;
  subsGross: number;
  tipsGross: number;
  messagesGross: number;
  postsGross: number;
  streamsGross: number;
  referralsGross: number;
  totalEarningsGross: number;
}

/* ---------- Helpers ---------- */

function formatPeriod(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.getDate()} - ${end.getDate()} ${format(start, "MMMM yyyy", { locale: fr })}`;
}

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDec(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_STYLE: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  SENT: "Envoyée",
  PAID: "Payée",
};

/* ---------- Component ---------- */

export default function ModelInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/finance/invoices/my");
        const json = await res.json();
        if (json?.data) {
          setInvoices(
            Array.isArray(json.data) ? json.data : json.data.invoices || []
          );
        }
      } catch {
        // silent
      }
      setLoading(false);
    }
    fetchInvoices();
  }, []);

  async function toggleDetail(inv: Invoice) {
    if (expandedId === inv.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(inv.id);
    setDetailLoading(true);
    setDailyData([]);
    try {
      const res = await fetch(`/api/finance/invoices/my/${inv.id}/detail`);
      const json = await res.json();
      if (json?.data?.dailyBreakdown) {
        setDailyData(json.data.dailyBreakdown);
      }
    } catch {
      // silent
    }
    setDetailLoading(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function downloadPDF(inv: any) {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const f = (n: number) => `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const pStart = format(new Date(inv.periodStart), "d MMM yyyy", { locale: fr });
    const pEnd = format(new Date(inv.periodEnd), "d MMM yyyy", { locale: fr });

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("EXCLSV", 20, 25);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Recapitulatif", 20, 35);

    doc.setFontSize(10);
    doc.text(`Period : ${pStart} - ${pEnd}`, 20, 50);
    doc.text(`Date : ${format(new Date(), "d MMM yyyy", { locale: fr })}`, 20, 57);
    doc.text(`Ref : EXCLSV-${format(new Date(inv.periodStart), "yyyy-MM")}-${String(inv.id).slice(-3).toUpperCase()}`, 20, 64);

    let y = 80;
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
    doc.text(`OnlyFans Commission (${inv.ofCutPercent}%)`, 20, y);
    doc.text(`-${f(inv.ofFees)}`, 170, y, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Net after OF", 20, y);
    doc.text(f(inv.netAfterOF), 170, y, { align: "right" });
    y += 12;

    const modelPct = inv.modelSharePercent;
    doc.setFont("helvetica", "normal");
    doc.text(`Your share (${modelPct}%)`, 20, y);
    doc.text(f(inv.amountDue), 170, y, { align: "right" });
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Amount due:", 20, y);
    doc.text(f(inv.amountDue), 170, y, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Document generated by EXCLSV CRM", 20, 280);

    doc.save(`recapitulatif_${pStart.replace(/ /g, "_")}.pdf`);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Mes factures</h1>
        <p className="text-sm text-muted-foreground">
          Historique de vos factures bimensuelles
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && invoices.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune facture disponible</p>
          </CardContent>
        </Card>
      )}

      {!loading &&
        invoices.length > 0 &&
        invoices.map((inv) => (
          <Card key={inv.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Invoice header */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-lg">
                    {formatPeriod(inv.periodStart, inv.periodEnd)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn("text-xs font-medium", STATUS_STYLE[inv.status])}
                      variant="secondary"
                    >
                      {STATUS_LABEL[inv.status]}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  CA brut : {fmt(inv.grossRevenue)} · Commission OF ({inv.ofCutPercent}%) : -{fmt(inv.ofFees)} · Net : {fmt(inv.netAfterOF)} · Votre part ({inv.modelSharePercent}%) :{" "}
                  <span className="font-semibold text-foreground">{fmt(inv.amountDue)}</span>
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDetail(inv)}
                  >
                    {expandedId === inv.id ? (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1" />
                    )}
                    Voir le détail
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadPDF(inv)}>
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger PDF
                  </Button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === inv.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-6">
                  {detailLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {/* Breakdown by category */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">
                          Répartition par catégorie
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Catégorie</TableHead>
                              <TableHead className="text-right">Montant brut</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[
                              { label: "Subscriptions", value: inv.subsRevenue },
                              { label: "Tips", value: inv.tipsRevenue },
                              { label: "Messages", value: inv.messagesRevenue },
                              { label: "Posts", value: inv.postsRevenue },
                              { label: "Streams", value: inv.streamsRevenue },
                              { label: "Referrals", value: inv.referralsRevenue },
                            ].map((row) => (
                              <TableRow key={row.label}>
                                <TableCell className="text-sm">{row.label}</TableCell>
                                <TableCell className="text-right text-sm">
                                  {fmtDec(row.value)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="font-bold">
                              <TableCell>Total brut</TableCell>
                              <TableCell className="text-right">
                                {fmtDec(inv.grossRevenue)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>

                      {/* Daily breakdown */}
                      {dailyData.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3">
                            Détail jour par jour
                          </h3>
                          <div className="max-h-[300px] overflow-y-auto rounded border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead className="text-right">Subs</TableHead>
                                  <TableHead className="text-right">Tips</TableHead>
                                  <TableHead className="text-right">Msg</TableHead>
                                  <TableHead className="text-right">Posts</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dailyData.map((d, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="text-xs">
                                      {format(new Date(d.date), "d MMM", { locale: fr })}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {fmt(d.subsGross)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {fmt(d.tipsGross)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {fmt(d.messagesGross)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {fmt(d.postsGross)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-medium">
                                      {fmt(d.totalEarningsGross)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {/* Final calculation */}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total brut</span>
                          <span className="font-medium">{fmtDec(inv.grossRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Commission OnlyFans ({inv.ofCutPercent}%)</span>
                          <span>-{fmtDec(inv.ofFees)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Net après OF</span>
                          <span>{fmtDec(inv.netAfterOF)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span>Votre part ({inv.modelSharePercent}%)</span>
                          <span>{fmtDec(inv.amountDue)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
