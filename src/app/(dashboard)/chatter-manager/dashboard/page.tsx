import { auth } from "@/lib/auth";

export default async function ChatterManagerDashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Tableau de bord — Manager
      </h1>
      <p className="text-muted-foreground">
        Bienvenue, {session?.user?.name}. Gérez vos chatters et le planning.
      </p>
    </div>
  );
}
