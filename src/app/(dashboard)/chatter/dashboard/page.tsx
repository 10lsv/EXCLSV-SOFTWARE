import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Clock, Bell } from "lucide-react";

export default async function ChatterDashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "";

  const kpis = [
    { label: "Customs à faire", value: "0", icon: MessageSquare },
    { label: "Heures cette semaine", value: "0h", icon: Clock },
    { label: "Notifications", value: "0", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour {firstName} !
        </h1>
        <p className="text-sm text-muted-foreground">
          Consultez vos customs et votre planning.
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
