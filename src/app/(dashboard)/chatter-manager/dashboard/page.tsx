import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Calendar } from "lucide-react";

export default async function ChatterManagerDashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "";

  const kpis = [
    { label: "Chatters actifs", value: "0", icon: Users },
    { label: "Customs en cours", value: "0", icon: FileText },
    { label: "Shifts aujourd'hui", value: "0", icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour {firstName} !
        </h1>
        <p className="text-sm text-muted-foreground">
          Gérez vos chatters et le planning.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
