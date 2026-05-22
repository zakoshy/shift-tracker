"use client";

import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { 
  Activity, 
  LayoutDashboard, 
  Clock, 
  Users, 
  LogOut,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function SidebarNav() {
  const { profile, organization, loading } = usePulseLogAuth();
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const navItems = profile?.role === 'admin' 
    ? [
        { label: 'Overview', icon: LayoutDashboard, href: '/dashboard/admin' },
        { label: 'Staff Roster', icon: Users, href: '/dashboard/admin/roster' },
      ]
    : [
        { label: 'My Shift', icon: Clock, href: '/dashboard/staff' },
      ];

  return (
    <div className="h-full flex flex-col bg-white border-r w-full md:w-64 shrink-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 mb-8 group">
          <Activity className="h-7 w-7 text-primary transition-transform group-hover:scale-110" strokeWidth={2.5} />
          <div className="flex flex-col">
            <span className="text-xl font-headline font-bold text-primary leading-tight">PulseLog</span>
            {organization && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate max-w-[120px]">
                {organization.name}
              </span>
            )}
          </div>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                pathname === item.href 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", pathname === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <div className="border-t pt-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
        
        <div className="flex items-center gap-3 px-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="text-sm font-bold text-foreground truncate">{profile?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate uppercase font-bold tracking-tighter">{profile?.department}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
