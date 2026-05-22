"use client";

import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Menu, Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, organization, loading } = usePulseLogAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" strokeWidth={2.5} />
          <span className="text-lg font-headline font-bold text-primary">PulseLog</span>
        </div>
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-none shadow-xl">
            <div className="h-full" onClick={() => setIsSidebarOpen(false)}>
              <SidebarNav />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block">
        <SidebarNav />
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
