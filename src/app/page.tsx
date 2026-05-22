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

export default function Home() {
  const { user, profile, loading } = usePulseLogAuth();
  const router = useRouter();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === 'admin') {
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
      <header className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-primary/5">
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" strokeWidth={2.5} />
          <span className="text-2xl font-headline font-bold text-primary tracking-tight">PulseLog</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-bold">Staff Login</Button>
          </Link>
          <Link href="/signup">
            <Button className="font-bold px-6">Institutional Signup</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6">
        <div className="pt-20 pb-24 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
            <ShieldCheck className="h-4 w-4" />
            HIPAA-Ready Architecture
          </div>
          <h1 className="text-6xl md:text-7xl font-headline font-extrabold tracking-tight text-foreground mb-8 leading-[1.1]">
            Operational Intelligence for <span className="text-primary italic">Modern Healthcare</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            PulseLog automates attendance, synthesizes clinical handovers, and monitors staff wellness using Gemini-powered AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/signup">
              <Button size="lg" className="h-16 px-10 text-xl font-bold shadow-2xl shadow-primary/30">
                Deploy for Your Facility
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-16 px-10 text-xl font-bold bg-white border-2">
                Staff Demo
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-32">
          <div className="bg-card p-10 rounded-3xl shadow-sm border-2 border-primary/5 transition-all hover:border-primary/20 group">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-2xl font-headline font-bold mb-4">BYOD Clock-In</h3>
            <p className="text-muted-foreground leading-relaxed">Zero-friction arrival tracking. Staff scan a terminal QR code to log presence, eliminating hardware costs and bottlenecks.</p>
          </div>
          <div className="bg-card p-10 rounded-3xl shadow-sm border-2 border-accent/5 transition-all hover:border-accent/20 group">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <BrainCircuit className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-2xl font-headline font-bold mb-4">AI Handover Analysis</h3>
            <p className="text-muted-foreground leading-relaxed">Automated synthesis of shift notes. Our AI extracts critical patient updates and operational themes from unstructured text.</p>
          </div>
          <div className="bg-card p-10 rounded-3xl shadow-sm border-2 border-green-500/5 transition-all hover:border-green-500/20 group">
            <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="text-2xl font-headline font-bold mb-4">Burnout Prevention</h3>
            <p className="text-muted-foreground leading-relaxed">Proactive wellness tracking. Integrated mood-scoring helps admins identify departmental fatigue before it impacts care quality.</p>
          </div>
        </div>

        <div className="bg-primary/5 rounded-[3rem] p-12 md:p-20 mb-32">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-headline font-bold mb-6">Unified Administrative Oversight</h2>
            <p className="text-muted-foreground text-lg">Three steps to institutional transformation.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="relative">
              <div className="text-8xl font-black text-primary/5 absolute -top-10 -left-4">01</div>
              <div className="relative z-10">
                <h4 className="text-xl font-bold mb-3">Instant Deployment</h4>
                <p className="text-sm text-muted-foreground">Register your facility in seconds. Multi-tenant isolation ensures your data stays within your organization.</p>
              </div>
            </div>
            <div className="relative">
              <div className="text-8xl font-black text-primary/5 absolute -top-10 -left-4">02</div>
              <div className="relative z-10">
                <h4 className="text-xl font-bold mb-3">Self-Onboarding</h4>
                <p className="text-sm text-muted-foreground">Distribute the unique QR code. Staff register their own name and department without HR intervention.</p>
              </div>
            </div>
            <div className="relative">
              <div className="text-8xl font-black text-primary/5 absolute -top-10 -left-4">03</div>
              <div className="relative z-10">
                <h4 className="text-xl font-bold mb-3">Live Intelligence</h4>
                <p className="text-sm text-muted-foreground">Receive real-time presence grids and AI-generated executive summaries of every shift directly in your portal.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center pb-24 border-t border-primary/5 pt-24">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-12">Built for Excellence</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale">
            <div className="flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> <span className="font-bold">SECURE DATA</span></div>
            <div className="flex items-center gap-2"><Users className="h-6 w-6" /> <span className="font-bold">MULTI-TENANT</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-6 w-6" /> <span className="font-bold">GENKIT AI</span></div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-headline font-bold text-primary">PulseLog</span>
          </div>
          <p className="text-sm text-muted-foreground italic font-medium">&copy; {currentYear} PulseLog Healthcare Solutions. Precision in every pulse.</p>
        </div>
      </footer>
    </div>
  );
}
