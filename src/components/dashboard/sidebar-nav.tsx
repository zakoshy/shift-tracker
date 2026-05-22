
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
  Loader2,
  ChevronRight,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar
} from "@/components/ui/sidebar";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SidebarNav() {
  const { profile, organization, loading } = usePulseLogAuth();
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { setOpenMobile } = useSidebar();

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

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group overflow-hidden">
            <Activity className="h-7 w-7 text-primary transition-transform group-hover:scale-110 shrink-0" strokeWidth={2.5} />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-xl font-headline font-bold text-primary leading-tight">PulseLog</span>
              {organization && (
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate max-w-[120px]">
                  {organization.name}
                </span>
              )}
            </div>
          </Link>
          <div className="group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest opacity-60 group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className={cn(
                      "flex items-center gap-3 px-4 py-6 rounded-xl text-sm font-medium transition-all",
                      pathname === item.href 
                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:text-primary-foreground" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Link href={item.href} onClick={handleLinkClick}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2 mb-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shrink-0">
                    {profile?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col min-w-0 overflow-hidden group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-bold text-foreground truncate">{profile?.name || 'User'}</span>
                    <span className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tighter">{profile?.department}</span>
                  </div>
                </>
              )}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Logout"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl px-4 py-5"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
