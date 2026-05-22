
"use client";

import { useState, useEffect } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore } from "@/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  AlertCircle, 
  Smile, 
  Meh,
  Frown,
  Activity,
  TrendingUp,
  BrainCircuit,
  Loader2,
  ShieldCheck,
  Monitor,
  MapPin,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { AttendanceLog } from "@/lib/types";
import { summarizeHandoverNotes, SummarizeHandoverNotesOutput } from "@/ai/flows/summarize-handover-notes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const { profile, organization } = usePulseLogAuth();
  const db = useFirestore();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<SummarizeHandoverNotesOutput | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!profile?.organizationId || !db) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, "attendance_logs"),
      where("organizationId", "==", profile.organizationId),
      where("date", "==", today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceLog[];
      // Client-side sort to avoid complex index requirements initially
      const sortedData = [...data].sort((a, b) => {
        const timeA = a.clockInTime || '';
        const timeB = b.clockInTime || '';
        return timeB.localeCompare(timeA);
      });
      setLogs(sortedData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, db]);

  const stats = {
    totalOnSite: logs.filter(l => !l.clockOutTime).length,
    lateArrivals: logs.filter(l => l.status === 'late').length,
    earlyDepartures: logs.filter(l => l.status === 'early-departure').length,
    avgMood: logs.filter(l => l.moodRating).length > 0 
      ? (logs.reduce((acc, curr) => acc + (curr.moodRating || 0), 0) / logs.filter(l => l.moodRating).length).toFixed(1)
      : "N/A"
  };

  const handleSetPerimeter = () => {
    if (!navigator.geolocation) {
      toast({ title: "Unsupported", description: "Browser geolocation not available.", variant: "destructive" });
      return;
    }

    setSettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!organization?.id || !db) return;
        try {
          await updateDoc(doc(db, "organizations", organization.id), {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radiusInMeters: 200, // Default 200m
          });
          toast({ title: "Perimeter Locked", description: "This location is now the institutional clock-in center." });
        } catch (err) {
          toast({ title: "Error", description: "Failed to update organization location.", variant: "destructive" });
        } finally {
          setSettingLocation(false);
        }
      },
      (error) => {
        toast({ title: "GPS Error", description: "Could not retrieve your current location.", variant: "destructive" });
        setSettingLocation(false);
      }
    );
  };

  const handleGenAIReport = async () => {
    const notes = logs.filter(l => l.handoverNotes).map(l => `${l.userName} (${l.userDepartment}): ${l.handoverNotes}`);
    if (notes.length === 0) {
      toast({ title: "No Data", description: "No handover notes available to summarize for today.", variant: "destructive" });
      return;
    }

    setSummarizing(true);
    try {
      const result = await summarizeHandoverNotes({
        handoverNotes: notes,
        startDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setAiSummary(result);
      toast({ title: "Summary Ready", description: "Institutional intelligence report generated via Gemini." });
    } catch (err) {
      toast({ title: "AI Error", description: "Failed to generate AI summary.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Encrypted Operations Dashboard</span>
          </div>
          <h1 className="text-3xl font-headline font-bold text-foreground">Institutional Overview</h1>
          <p className="text-muted-foreground">{organization?.name} • Live Status Grid for {format(new Date(), 'MMMM do, yyyy')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-2 border-primary/20">
                <Settings className="mr-2 h-4 w-4" />
                Configure Geofence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Institutional Geofence</DialogTitle>
                <DialogDescription>
                  Set the physical perimeter for your facility. Staff must be within 200m of this location to clock in.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-xl border">
                  <MapPin className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-bold">Current Center</p>
                    <p className="text-xs text-muted-foreground">
                      {organization?.latitude ? `${organization.latitude.toFixed(4)}, ${organization.longitude?.toFixed(4)}` : "Not Established"}
                    </p>
                  </div>
                </div>
                <Button onClick={handleSetPerimeter} disabled={settingLocation} className="w-full">
                  {settingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                  Lock Perimeter to My Current Location
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">Ensure you are physically at the facility entrance before locking.</p>
              </div>
            </DialogContent>
          </Dialog>

          <Link href={`/dashboard/admin/terminal`} target="_blank">
            <Button variant="outline" className="bg-white border-2 border-primary/20 hover:bg-primary/5">
              <Monitor className="mr-2 h-4 w-4 text-primary" />
              Launch Scan Terminal
            </Button>
          </Link>
          <Button onClick={handleGenAIReport} disabled={summarizing || logs.length === 0} className="shadow-lg shadow-primary/20 bg-primary">
            {summarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Synthesize Handovers
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Users className="h-20 w-20" strokeWidth={1} />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-2">Verified Personnel</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tighter">{stats.totalOnSite}</span>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full animate-pulse">LIVE NOW</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative border-l-4 border-l-destructive">
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Protocol Breaches</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-destructive tracking-tighter">{stats.lateArrivals}</span>
              <span className="text-[10px] font-bold text-destructive uppercase">Lateness</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative border-l-4 border-l-accent">
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Early Departures</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-accent tracking-tighter">{stats.earlyDepartures}</span>
              <span className="text-[10px] font-bold text-accent uppercase">Unauthorized</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Institutional Morale</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-green-600 tracking-tighter">{stats.avgMood}</span>
              <Smile className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {aiSummary && (
        <Card className="border-2 border-primary/20 bg-primary/[0.02] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrainCircuit className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl font-headline">Gemini Handover Intelligence</CardTitle>
              </div>
              <Badge variant="outline" className="bg-white border-primary/20 text-primary font-bold">PRODUCTION GRADE</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Executive Summary</h4>
                  <p className="text-foreground leading-relaxed text-lg">{aiSummary.summary}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Overall Sentiment</h4>
                  <Badge className={cn(
                    "px-4 py-1 text-sm font-bold capitalize",
                    aiSummary.overallSentiment === 'positive' && "bg-green-500",
                    aiSummary.overallSentiment === 'negative' && "bg-destructive",
                    aiSummary.overallSentiment === 'neutral' && "bg-slate-500",
                    aiSummary.overallSentiment === 'mixed' && "bg-amber-500",
                  )}>
                    {aiSummary.overallSentiment}
                  </Badge>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-destructive mb-3">Critical Issues Identified</h4>
                  <ul className="space-y-2">
                    {aiSummary.criticalIssues.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-accent mb-3">Recurring Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiSummary.keyThemes.map((theme, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-accent/10 text-accent border-accent/20 px-3 py-1">{theme}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-primary/10">
              <h4 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Burnout Prevention Trends</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiSummary.staffWellbeingTrends.map((trend, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{trend}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-headline font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Live Presence Grid
          </h2>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Auto-Synchronizing Data Stream</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse h-48 bg-muted border-none shadow-none" />
            ))
          ) : logs.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-primary/10">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">No verified presence recorded for today.</p>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className={cn(
                "shadow-sm hover:shadow-md transition-all border",
                log.clockOutTime ? "border-muted bg-muted/5 opacity-80" : "border-primary/10 bg-white"
              )}>
                <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
                      {log.userName.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-headline font-bold">{log.userName}</CardTitle>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tighter font-bold">{log.userDepartment}</p>
                    </div>
                  </div>
                  {log.status === 'late' && <Badge variant="destructive" className="text-[9px] h-4 px-1 uppercase tracking-tighter">Verified Late</Badge>}
                </CardHeader>
                <CardContent className="p-4 pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2 rounded-xl border">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Clock-In</span>
                      <span className="text-xs font-bold font-mono">{log.clockInTime?.substring(0, 5) || '--:--'}</span>
                    </div>
                    <div className="flex flex-col border-l pl-2">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Clock-Out</span>
                      <span className="text-xs font-bold font-mono">{log.clockOutTime?.substring(0, 5) || '--:--'}</span>
                    </div>
                  </div>
                  
                  {log.clockOutTime ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">Mood:</span>
                        {log.moodRating === 3 && <Smile className="h-4 w-4 text-green-500" />}
                        {log.moodRating === 2 && <Meh className="h-4 w-4 text-amber-500" />}
                        {log.moodRating === 1 && <Frown className="h-4 w-4 text-red-500" />}
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-green-50 border-green-200 text-green-700 uppercase font-bold tracking-widest">Handover Secure</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">Active On-Site</span>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground animate-spin [animation-duration:10s]" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
