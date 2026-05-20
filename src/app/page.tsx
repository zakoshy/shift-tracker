
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Clock, FileText } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, profile, loading } = usePulseLogAuth();
  const router = useRouter();

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
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" strokeWidth={2.5} />
          <span className="text-2xl font-headline font-bold text-primary">PulseLog</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/signup">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-16 pb-24 text-center">
        <h1 className="text-5xl md:text-6xl font-headline font-extrabold tracking-tight text-foreground max-w-4xl mx-auto mb-6">
          Precision Attendance & <span className="text-primary">Seamless Handover</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          PulseLog is the secure, multi-tenant platform designed for healthcare precision. Track shifts, monitor well-being, and ensure continuity of care with AI-driven summaries.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-24">
          <Link href="/signup">
            <Button size="lg" className="h-14 px-8 text-lg font-semibold">Deploy for Organization</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold bg-white">Staff Login</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-card p-8 rounded-2xl shadow-sm border text-left">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-headline font-bold mb-3">One-Tap Clock-In</h3>
            <p className="text-muted-foreground">Mobile-optimized interface for quick arrival and departure tracking with precise institutional flags.</p>
          </div>
          <div className="bg-card p-8 rounded-2xl shadow-sm border text-left">
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
              <ShieldCheck className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-headline font-bold mb-3">Multi-Tenant Isolation</h3>
            <p className="text-muted-foreground">Enterprise-grade data security with strict organization-level partitioning and role-based access.</p>
          </div>
          <div className="bg-card p-8 rounded-2xl shadow-sm border text-left">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-headline font-bold mb-3">AI Handover Analysis</h3>
            <p className="text-muted-foreground">Automatically synthesize daily shift notes into actionable administrative intelligence and trend reports.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
