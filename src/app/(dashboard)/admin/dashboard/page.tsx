import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, DollarSign, Headphones } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();

  const kpis = [
    { label: "Modèles actifs", value: "0", icon: Users },
    { label: "Customs en cours", value: "0", icon: FileText },
    { label: "Revenus ce mois", value: "$0", icon: DollarSign },
    { label: "Chatters en ligne", value: "0", icon: Headphones },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue, {session?.user?.name}. Voici un aperçu de votre agence.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
