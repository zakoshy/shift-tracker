"use client";

import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, ShieldCheck, MapPin, Loader2, Monitor } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function TerminalPage() {
  const { organization, loading } = usePulseLogAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const terminalUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/dashboard/staff` 
    : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-8 font-sans">
      <div className="absolute top-12 flex items-center gap-3">
        <Activity className="h-10 w-10 text-primary" strokeWidth={3} />
        <h1 className="text-4xl font-bold tracking-tighter">PulseLog <span className="text-primary">Terminal</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-7xl w-full">
        <div className="space-y-8">
          <div>
            <Badge variant="outline" className="border-primary text-primary px-4 py-1 text-sm font-bold tracking-[0.3em] uppercase mb-4 bg-primary/5">
              Secure Checkpoint
            </Badge>
            <h2 className="text-7xl font-bold leading-none tracking-tighter mb-4">
              {organization?.name}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground text-xl">
              <MapPin className="h-6 w-6" />
              <span>Verified Institutional Perimeter</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-primary">System Time</p>
            <div className="text-8xl font-mono font-bold tracking-tighter">
              {format(time, 'HH:mm')}
              <span className="text-3xl ml-2 text-white/40">{format(time, 'ss')}</span>
            </div>
            <p className="text-muted-foreground font-medium text-lg">{format(time, 'EEEE, MMMM do, yyyy')}</p>
          </div>

          <div className="flex items-start gap-4 p-6 bg-primary/10 border border-primary/20 rounded-2xl">
            <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
            <div>
              <h4 className="font-bold text-lg">Anti-Fraud Protocol Active</h4>
              <p className="text-white/60 text-sm">Clock-in requires active on-site GPS verification. Remote check-ins are automatically flagged and rejected.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8">
          <Card className="p-12 bg-white rounded-[3rem] shadow-[0_0_80px_rgba(41,85,178,0.2)] border-none">
            <CardContent className="p-0 flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG 
                  value={terminalUrl} 
                  size={320} 
                  level="H" 
                  includeMargin={false}
                  className="text-black"
                />
              </div>
              <p className="mt-8 text-black font-bold text-xl uppercase tracking-widest text-center">
                Scan to Verify Presence
              </p>
              <p className="text-black/40 text-sm font-medium mt-2">Personal Device Required</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="absolute bottom-12 flex items-center gap-8 opacity-40 grayscale">
        <span className="text-xs font-bold tracking-[0.2em] uppercase">HIPAA Compliant</span>
        <span className="text-xs font-bold tracking-[0.2em] uppercase">Encrypted Logs</span>
        <span className="text-xs font-bold tracking-[0.2em] uppercase">GPS Fenced</span>
      </div>
    </div>
  );
}

function Badge({ className, variant, children }: any) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </div>
  );
}
