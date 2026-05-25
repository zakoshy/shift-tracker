
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  ShieldCheck, 
  Smartphone, 
  Users, 
  BrainCircuit,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const { user, profile, loading } = usePulseLogAuth();
  const router = useRouter();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'super-admin') {
        router.push('/dashboard/super-admin');
      } else if (profile.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (profile.role === 'staff') {
        router.push('/dashboard/staff');
      }
    }
  }, [user, profile, loading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Activity className="h-12 w-12 text-primary animate-pulse" />
        <p className="text-muted-foreground font-medium animate-pulse">Initializing PulseLog...</p>
      </div>
    </div>
  );

  const dashboardUrl = profile?.role === 'super-admin' ? '/dashboard/super-admin' : 
                      profile?.role === 'admin' ? '/dashboard/admin' : 
                      '/dashboard/staff';

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-primary/5">
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" strokeWidth={2.5} />
          <span className="text-xl md:text-2xl font-headline font-bold text-primary tracking-tight">PulseLog</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
          <ThemeToggle />
          {user ? (
            <Link href={dashboardUrl}>
              <Button variant="outline" className="font-bold gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="flex-1 sm:flex-none">
                <Button variant="ghost" className="w-full font-bold text-xs md:text-sm">Staff Login</Button>
              </Link>
              <Link href="/signup" className="flex-1 sm:flex-none">
                <Button className="w-full font-bold px-4 md:px-6 text-xs md:text-sm">Institutional Signup</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6">
        <div className="pt-12 md:pt-20 pb-16 md:pb-24 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6">
            <ShieldCheck className="h-4 w-4" />
            Governance Enabled Architecture
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-extrabold tracking-tight text-foreground mb-6 md:mb-8 leading-[1.1]">
            Operational Intelligence for <span className="text-primary italic">Modern Organizations</span>
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-2">
            PulseLog automates attendance, synthesizes operational handovers, and monitors workforce wellness using Gemini-powered AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
            {user ? (
              <Link href={dashboardUrl} className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 md:h-16 px-6 md:px-10 text-lg md:text-xl font-bold shadow-2xl shadow-primary/30">
                  Return to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
            ) : (
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 md:h-16 px-6 md:px-10 text-lg md:text-xl font-bold shadow-2xl shadow-primary/30">
                  Deploy for Your Organization
                  <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-20 md:mb-32">
          <div className="bg-card p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border-2 border-primary/5 transition-all hover:border-primary/20 group">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform">
              <Smartphone className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-headline font-bold mb-3 md:mb-4">Hybrid Attendance</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">BYOD QR clock-in for mobile users, with a Digital Security Ledger for staff without smartphones.</p>
          </div>
          <div className="bg-card p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border-2 border-accent/5 transition-all hover:border-accent/20 group">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-accent/10 flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform">
              <BrainCircuit className="h-6 w-6 md:h-7 md:w-7 text-accent" />
            </div>
            <h3 className="text-xl md:text-2xl font-headline font-bold mb-3 md:mb-4">AI Handover Analysis</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Automated synthesis of shift notes. Our AI extracts critical operational themes and urgent issues.</p>
          </div>
          <div className="bg-card p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border-2 border-green-500/5 transition-all hover:border-green-500/20 group">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-green-600" />
            </div>
            <h3 className="text-xl md:text-2xl font-headline font-bold mb-3 md:mb-4">Operational Wellness</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Proactive fatigue tracking. Integrated morale-scoring helps identify departmental burnout patterns.</p>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-headline font-bold text-primary">PulseLog</span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground italic font-medium">&copy; {currentYear} PulseLog Intelligence. Institutional Precision.</p>
        </div>
      </footer>
    </div>
  );
}
