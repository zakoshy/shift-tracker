
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
  CheckCircle2
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
      } else {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-4 md:px-6 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-primary/5">
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" strokeWidth={2.5} />
          <span className="text-xl md:text-2xl font-headline font-bold text-primary tracking-tight">PulseLog</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
          <ThemeToggle />
          <Link href="/login" className="flex-1 sm:flex-none">
            <Button variant="ghost" className="w-full font-bold text-xs md:text-sm">Staff Login</Button>
          </Link>
          <Link href="/signup" className="flex-1 sm:flex-none">
            <Button className="w-full font-bold px-4 md:px-6 text-xs md:text-sm">Institutional Signup</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6">
        <div className="pt-12 md:pt-20 pb-16 md:pb-24 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6">
            <ShieldCheck className="h-4 w-4" />
            HIPAA-Ready Architecture
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-extrabold tracking-tight text-foreground mb-6 md:mb-8 leading-[1.1]">
            Operational Intelligence for <span className="text-primary italic">Modern Healthcare</span>
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-2">
            PulseLog automates attendance, synthesizes clinical handovers, and monitors staff wellness using Gemini-powered AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full h-14 md:h-16 px-6 md:px-10 text-lg md:text-xl font-bold shadow-2xl shadow-primary/30">
                Deploy for Your Facility
                <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-20 md:mb-32">
          <div className="bg-card p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border-2 border-primary/5 transition-all hover:border-primary/20 group">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform">
              <Smartphone className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-headline font-bold mb-3 md:mb-4">BYOD Clock-In</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Zero-friction arrival tracking. Staff scan a terminal QR code to log presence, eliminating hardware costs.</p>
          </div>
          <div className="bg-card p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border-2 border-accent/5 transition-all hover:border-accent/20 group">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-accent/10 flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform">
              <BrainCircuit className="h-6 w-6 md:h-7 md:w-7 text-accent" />
            </div>
            <h3 className="text-xl md:text-2xl font-headline font-bold mb-3 md:mb-4">AI Handover Analysis</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Automated synthesis of shift notes. Our AI extracts critical patient updates and operational themes.</p>
          </div>
          <div className="bg-card p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border-2 border-green-500/5 transition-all hover:border-green-500/20 group">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-green-600" />
            </div>
            <h3 className="text-xl md:text-2xl font-headline font-bold mb-3 md:mb-4">Burnout Prevention</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">Proactive wellness tracking. Integrated mood-scoring helps admins identify departmental fatigue.</p>
          </div>
        </div>

        <div className="bg-primary/5 rounded-[2rem] md:rounded-[3rem] p-8 md:p-20 mb-20 md:mb-32">
          <div className="max-w-4xl mx-auto text-center mb-10 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-headline font-bold mb-4 md:mb-6">Unified Administrative Oversight</h2>
            <p className="text-sm md:text-lg text-muted-foreground">Three steps to institutional transformation.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-12">
            <div className="relative">
              <div className="text-6xl md:text-8xl font-black text-primary/5 absolute -top-6 md:-top-10 -left-2 md:-left-4">01</div>
              <div className="relative z-10">
                <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Instant Deployment</h4>
                <p className="text-xs md:text-sm text-muted-foreground">Register your facility in seconds. Multi-tenant isolation ensures your data stays within your organization.</p>
              </div>
            </div>
            <div className="relative">
              <div className="text-6xl md:text-8xl font-black text-primary/5 absolute -top-6 md:-top-10 -left-2 md:-left-4">02</div>
              <div className="relative z-10">
                <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Self-Onboarding</h4>
                <p className="text-xs md:text-sm text-muted-foreground">Distribute the unique QR code. Staff register their own name and department without HR intervention.</p>
              </div>
            </div>
            <div className="relative">
              <div className="text-6xl md:text-8xl font-black text-primary/5 absolute -top-6 md:-top-10 -left-2 md:-left-4">03</div>
              <div className="relative z-10">
                <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Live Intelligence</h4>
                <p className="text-xs md:text-sm text-muted-foreground">Receive real-time presence grids and AI-generated executive summaries of every shift directly in your portal.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center pb-16 md:pb-24 border-t border-primary/5 pt-16 md:pt-24">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-8 md:mb-12">Built for Excellence</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 opacity-50 grayscale">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 md:h-6 md:w-6" /> <span className="font-bold text-xs md:text-sm">SECURE DATA</span></div>
            <div className="flex items-center gap-2"><Users className="h-5 w-5 md:h-6 md:w-6" /> <span className="font-bold text-xs md:text-sm">MULTI-TENANT</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" /> <span className="font-bold text-xs md:text-sm">GENKIT AI</span></div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-headline font-bold text-primary">PulseLog</span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground italic font-medium">&copy; {currentYear} PulseLog Healthcare Solutions. Precision in every pulse.</p>
        </div>
      </footer>
    </div>
  );
}
