"use client";

import { useState } from "react";
import { Role } from "@prisma/client";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 pt-10">
        <div className="px-4 pb-4">
          <h2 className="text-lg font-bold tracking-tight">EXCLSV</h2>
        </div>
        <div onClick={() => setOpen(false)}>
          <SidebarNav role={role} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
