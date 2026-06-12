
"use client";

import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, ShieldCheck, MapPin, Loader2, Monitor, ShieldAlert, Download, Printer } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { format } from "date-fns";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function TerminalPage() {
  const { organization, loading } = usePulseLogAuth();
  const [time, setTime] = useState(new Date());
  const qrRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hardened absolute URL resolution for the terminal token
  const terminalUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/dashboard/staff` 
    : "";

  const hasLocation = !!(organization?.latitude && organization?.longitude);

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    
    const canvas = qrRef.current;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `PulseLog-Terminal-${organization?.name || 'Checkpoint'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Token Exported",
      description: "High-resolution sync token downloaded for facility printing.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!hasLocation) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-8 text-center">
        <ShieldAlert className="h-20 w-20 text-destructive mb-6" />
        <h2 className="text-4xl font-black tracking-tighter mb-4">Terminal Access Denied</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          The Operational Perimeter has not been established. GPS anti-fraud protocols require facility coordinates to generate a valid sync token.
        </p>
        <Link href="/dashboard/admin">
          <Button size="lg" className="rounded-2xl h-14 px-8 font-bold">Return to Command Center</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      <div className="absolute top-8 md:top-12 flex items-center gap-3">
        <Activity className="h-8 w-8 md:h-10 md:h-10 text-primary" strokeWidth={3} />
        <h1 className="text-2xl md:text-4xl font-bold tracking-tighter">PulseLog <span className="text-primary">Terminal</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center max-w-7xl w-full">
        <div className="space-y-6 md:space-y-8 text-center lg:text-left">
          <div className="flex flex-col items-center lg:items-start">
            <div className="inline-flex items-center rounded-full border border-primary text-primary px-4 py-1 text-[10px] md:text-sm font-bold tracking-[0.3em] uppercase mb-4 bg-primary/5">
              Secure Checkpoint
            </div>
            <h2 className="text-4xl md:text-7xl font-bold leading-none tracking-tighter mb-4">
              {organization?.name}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground text-lg justify-center lg:justify-start">
              <MapPin className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-sm md:text-xl">Verified Institutional Perimeter</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-3xl space-y-2">
            <p className="text-[10px] md:text-[12px] font-bold uppercase tracking-[0.4em] text-primary">System Time</p>
            <div className="text-5xl md:text-8xl font-mono font-bold tracking-tighter">
              {format(time, 'HH:mm')}
              <span className="text-xl md:text-3xl ml-2 text-white/40">{format(time, 'ss')}</span>
            </div>
            <p className="text-muted-foreground font-medium text-sm md:text-lg">{format(time, 'EEEE, MMMM do, yyyy')}</p>
          </div>

          <div className="flex items-start gap-4 p-4 md:p-6 bg-primary/10 border border-primary/20 rounded-2xl text-left">
            <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-primary shrink-0" />
            <div>
              <h4 className="font-bold text-sm md:text-lg">Anti-Fraud Protocol Active</h4>
              <p className="text-white/60 text-xs md:text-sm">Clock-in requires active on-site GPS verification. Remote check-ins are automatically flagged.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8">
          <Card className="p-6 md:p-12 bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_0_80px_rgba(41,85,178,0.2)] border-none w-full max-w-sm md:max-w-none">
            <CardContent className="p-0 flex flex-col items-center">
              <div className="bg-white p-2 md:p-4 rounded-2xl">
                <QRCodeCanvas 
                  ref={qrRef}
                  value={terminalUrl} 
                  size={320} 
                  level="H" 
                  includeMargin={true}
                  className="text-black w-full max-w-[200px] md:max-w-full h-auto"
                />
              </div>
              <p className="mt-6 md:mt-8 text-black font-bold text-sm md:text-xl uppercase tracking-widest text-center">
                Scan to Verify Presence
              </p>
              
              <div className="mt-8 flex gap-3">
                <Button 
                  onClick={handleDownloadQR}
                  className="rounded-xl h-12 px-6 bg-[#0A0A0B] text-white hover:bg-[#1A1A1B] flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download for Print
                </Button>
              </div>
              <p className="text-black/40 text-[10px] md:text-sm font-medium mt-4">Personal Session Required</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="absolute bottom-6 md:bottom-12 flex flex-wrap justify-center items-center gap-4 md:gap-8 opacity-40 grayscale px-4">
        <span className="text-[8px] md:text-xs font-bold tracking-[0.2em] uppercase">Security Verified</span>
        <span className="text-[8px] md:text-xs font-bold tracking-[0.2em] uppercase">Encrypted Logs</span>
        <span className="text-[8px] md:text-xs font-bold tracking-[0.2em] uppercase">GPS Fenced</span>
      </div>
    </div>
  );
}
