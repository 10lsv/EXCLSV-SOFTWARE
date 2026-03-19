import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Separator } from "@/components/ui/separator";

const notifPathByRole: Record<string, string> = {
  OWNER: "/admin/notifications",
  ADMIN: "/admin/notifications",
  CHATTER_MANAGER: "/chatter-manager/notifications",
  CHATTER: "/chatter/notifications",
  MODEL: "/model/notifications",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { name, email, role } = session.user;

  // Onboarding redirect for MODEL users
  if (role === "MODEL") {
    const profile = await prisma.modelProfile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompleted: true },
    });
    if (profile && !profile.onboardingCompleted) {
      redirect("/model/onboarding");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center px-6">
          <h1 className="text-xl font-bold tracking-tight">EXCLSV</h1>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto">
          <SidebarNav role={role as Role} />
        </div>
        <Separator />
        <div className="p-3">
          <UserMenu name={name || ""} email={email || ""} role={role} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
          <MobileSidebar role={role as Role} />
          <div className="flex items-center gap-2">
            <NotificationBell notificationsPath={notifPathByRole[role] || "/admin/notifications"} />
            <div className="md:hidden">
              <UserMenu name={name || ""} email={email || ""} role={role} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
