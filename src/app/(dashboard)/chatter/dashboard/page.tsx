import { auth } from "@/lib/auth";

export default async function ChatterDashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Tableau de bord — Chatter
      </h1>
      <p className="text-muted-foreground">
        Bienvenue, {session?.user?.name}. Consultez vos customs et votre planning.
      </p>
    </div>
  );
}
