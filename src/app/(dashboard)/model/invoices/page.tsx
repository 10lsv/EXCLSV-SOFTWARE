"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ---------- Types ---------- */

interface Invoice {
  id: string;
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  amountDue: number;
  status: "SENT" | "PAID";
}

/* ---------- Helpers ---------- */

function formatPeriod(startStr: string, endStr: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const monthYear = format(start, "MMMM yyyy", { locale: fr });
  return `${startDay} - ${endDay} ${monthYear}`;
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`;
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mes factures</h1>
        <p className="text-sm text-muted-foreground">
          Historique de vos factures bimensuelles
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && invoices.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune facture disponible</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice cards */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {formatPeriod(inv.periodStart, inv.periodEnd)}
                  </p>
                  <Badge
                    className={cn(
                      "text-xs font-medium",
                      STATUS_STYLE[inv.status]
                    )}
                    variant="secondary"
                  >
                    {STATUS_LABEL[inv.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  CA brut : {fmtMoney(inv.grossRevenue)} &middot; Votre part :{" "}
                  <span className="font-medium text-foreground">
                    {fmtMoney(inv.amountDue)}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
