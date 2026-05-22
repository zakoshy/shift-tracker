
"use client";

import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Menu, Activity, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = usePulseLogAuth();
  const router = useRouter();

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
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <SidebarNav />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Dashboard Header */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl" />
              <div className="h-4 w-px bg-border mx-2 md:hidden" />
              <div className="flex items-center gap-2 md:hidden">
                <Activity className="h-6 w-6 text-primary" strokeWidth={2.5} />
                <span className="text-lg font-headline font-bold text-primary">PulseLog</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-background/50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
