
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
      const sortedData = [...data].sort((a, b) => {
        const timeA = a.clockInTime || '';
        const timeB = b.clockInTime || '';
        return timeB.localeCompare(timeA);
      });
      setLogs(sortedData);
      setLoading(false);
    }, (error) => {
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
            radiusInMeters: 200,
          });
          toast({ title: "Perimeter Locked", description: "Institutional check-in center established." });
        } catch (err) {
          toast({ title: "Error", description: "Failed to update location.", variant: "destructive" });
        } finally {
          setSettingLocation(false);
        }
      },
      (error) => {
        toast({ title: "GPS Error", description: "Could not retrieve location.", variant: "destructive" });
        setSettingLocation(false);
      }
    );
  };

  const handleGenAIReport = async () => {
    const notes = logs.filter(l => l.handoverNotes).map(l => `${l.userName} (${l.userDepartment}): ${l.handoverNotes}`);
    if (notes.length === 0) {
      toast({ title: "No Data", description: "No notes available for today.", variant: "destructive" });
      return;
    }

    setSummarizing(true);
    try {
      const result = await summarizeHandoverNotes({
        handoverNotes: notes,
        startDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setAiSummary(result);
      toast({ title: "Summary Ready", description: "Executive intelligence report generated." });
    } catch (err) {
      toast({ title: "AI Error", description: "Failed to synthesize handovers.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Institutional Operations Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">Operational Overview</h1>
          <p className="text-sm text-muted-foreground">{organization?.name} • Live Presence Grid</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-2 h-9">
                <Settings className="mr-2 h-4 w-4" />
                Geofence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Institutional Geofence</DialogTitle>
                <DialogDescription>
                  Establish the physical check-in radius for your facility.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-xl border">
                  <MapPin className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-bold">Current Locked Center</p>
                    <p className="text-xs text-muted-foreground">
                      {organization?.latitude ? `${organization.latitude.toFixed(4)}, ${organization.longitude?.toFixed(4)}` : "Not Established"}
                    </p>
                  </div>
                </div>
                <Button onClick={handleSetPerimeter} disabled={settingLocation} className="w-full">
                  {settingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                  Lock Perimeter to Device GPS
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Link href={`/dashboard/admin/terminal`} target="_blank">
            <Button variant="outline" size="sm" className="border-2 h-9 hover:bg-primary/5">
              <Monitor className="mr-2 h-4 w-4" />
              Terminal
            </Button>
          </Link>
          <Button onClick={handleGenAIReport} size="sm" disabled={summarizing || logs.length === 0} className="h-9 shadow-lg shadow-primary/20">
            {summarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Synthesize
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-2">Verified Personnel</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold tracking-tighter">{stats.totalOnSite}</span>
              <span className="text-[9px] md:text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">ACTIVE</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border-l-4 border-l-destructive">
          <CardContent className="p-4 md:p-6">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Lateness Flagged</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold text-destructive tracking-tighter">{stats.lateArrivals}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-destructive uppercase">Incidents</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border-l-4 border-l-amber-500">
          <CardContent className="p-4 md:p-6">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Early Departures</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold text-amber-500 tracking-tighter">{stats.earlyDepartures}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-amber-500 uppercase">Alerts</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border-l-4 border-l-green-500">
          <CardContent className="p-4 md:p-6">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Average Morale</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold text-green-600 tracking-tighter">{stats.avgMood}</span>
              <Smile className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {aiSummary && (
        <Card className="border-2 border-primary/20 bg-primary/5 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
          <CardHeader className="border-b border-primary/10 p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <BrainCircuit className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <CardTitle className="text-base md:text-xl font-headline">Intelligence Report</CardTitle>
              </div>
              <Badge variant="outline" className="text-[8px] md:text-[10px]">AI-GENERATED</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              <div className="space-y-4 md:space-y-6">
                <div>
                  <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-primary mb-2 md:mb-3">Executive Summary</h4>
                  <p className="text-foreground leading-relaxed text-sm md:text-lg">{aiSummary.summary}</p>
                </div>
                <div>
                  <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-primary mb-2 md:mb-3">Institutional Sentiment</h4>
                  <Badge className={cn(
                    "px-3 py-0.5 md:px-4 md:py-1 text-[10px] md:text-sm font-bold capitalize",
                    aiSummary.overallSentiment === 'positive' && "bg-green-500",
                    aiSummary.overallSentiment === 'negative' && "bg-destructive",
                    aiSummary.overallSentiment === 'neutral' && "bg-slate-500",
                    aiSummary.overallSentiment === 'mixed' && "bg-amber-500",
                  )}>
                    {aiSummary.overallSentiment}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4 md:space-y-6">
                <div>
                  <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-destructive mb-2 md:mb-3">Critical Alerts</h4>
                  <ul className="space-y-2">
                    {aiSummary.criticalIssues.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-foreground bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                        <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-destructive shrink-0 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-accent mb-2 md:mb-3">Clinical Themes</h4>
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    {aiSummary.keyThemes.map((theme, idx) => (
                      <Badge key={idx} variant="secondary" className="px-2 py-0.5 md:px-3 md:py-1 text-[9px] md:text-[10px]">{theme}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-headline font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Live Presence
          </h2>
          <span className="text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Auto-Updating</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse h-40 bg-muted" />
            ))
          ) : logs.length === 0 ? (
            <div className="col-span-full py-12 md:py-16 text-center bg-card rounded-2xl border-2 border-dashed">
              <Users className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-xs md:text-sm text-muted-foreground font-medium">No verified presence for today.</p>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className={cn(
                "shadow-sm transition-all border",
                log.clockOutTime ? "opacity-60 bg-muted/50" : "bg-card border-primary/10"
              )}>
                <CardHeader className="p-3 md:p-4 pb-0 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs md:text-sm">
                      {log.userName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-xs md:text-sm font-headline font-bold truncate">{log.userName}</CardTitle>
                      <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase font-bold truncate">{log.userDepartment}</p>
                    </div>
                  </div>
                  {log.status === 'late' && <Badge variant="destructive" className="text-[7px] md:text-[9px] uppercase px-1.5">Late</Badge>}
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-3 md:pt-4 space-y-3 md:space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2 rounded-lg border">
                    <div className="flex flex-col">
                      <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">In</span>
                      <span className="text-[10px] md:text-xs font-bold font-mono">{log.clockInTime?.substring(0, 5) || '--:--'}</span>
                    </div>
                    <div className="flex flex-col border-l pl-2">
                      <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Out</span>
                      <span className="text-[10px] md:text-xs font-bold font-mono">{log.clockOutTime?.substring(0, 5) || '--:--'}</span>
                    </div>
                  </div>
                  
                  {log.clockOutTime ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {log.moodRating === 3 && <Smile className="h-3 w-3 md:h-4 md:w-4 text-green-500" />}
                        {log.moodRating === 2 && <Meh className="h-3 w-3 md:h-4 md:w-4 text-amber-500" />}
                        {log.moodRating === 1 && <Frown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />}
                      </div>
                      <Badge variant="outline" className="text-[7px] md:text-[9px] uppercase tracking-widest">Handover OK</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] md:text-[9px] font-bold text-green-600 uppercase tracking-widest">On-Site</span>
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
