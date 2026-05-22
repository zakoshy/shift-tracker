
"use client";

import { useState, useEffect } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore } from "@/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Clock, 
  AlertCircle, 
  Smile, 
  Activity,
  BrainCircuit,
  Loader2,
  ShieldCheck,
  Monitor,
  MapPin,
  Settings,
  ArrowUpRight,
  ClipboardCheck,
  Trash2,
  Database,
  History
} from "lucide-react";
import { format, subDays } from "date-fns";
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
  DialogTrigger
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const { profile, organization } = usePulseLogAuth();
  const db = useFirestore();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<SummarizeHandoverNotesOutput | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
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
      setLogs(data);
      setLoading(false);
    }, () => setLoading(false));

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
          toast({ title: "Perimeter Locked", description: "Facility coordinates established." });
        } catch (err) {
          toast({ title: "Error", description: "Failed to update location.", variant: "destructive" });
        } finally {
          setSettingLocation(false);
        }
      },
      () => {
        toast({ title: "GPS Error", description: "Could not retrieve location.", variant: "destructive" });
        setSettingLocation(false);
      }
    );
  };

  const handleDeleteLog = async (logId: string) => {
    if (!db) return;
    const confirmDelete = window.confirm("SECURITY ALERT: This will permanently remove this shift record from the institutional log. Are you sure you wish to proceed?");
    if (!confirmDelete) return;
    
    try {
      await deleteDoc(doc(db, "attendance_logs", logId));
      toast({ title: "Record Deleted", description: "The shift log has been removed." });
    } catch (err) {
      toast({ title: "Error", description: "Unauthorized deletion attempt.", variant: "destructive" });
    }
  };

  const handleCleanupOldLogs = async () => {
    if (!db || !profile?.organizationId) return;
    const confirmCleanup = window.confirm("CAUTION: This will permanently delete all attendance logs older than 30 days. This action is irreversible and compliant with data retention protocols. Proceed?");
    if (!confirmCleanup) return;

    setCleaningUp(true);
    try {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const formattedDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
      
      const q = query(
        collection(db, "attendance_logs"),
        where("organizationId", "==", profile.organizationId),
        where("date", "<", formattedDate)
      );
      
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      toast({ title: "Database Optimized", description: `${snap.size} legacy records purged.` });
    } catch (err) {
      toast({ title: "Cleanup Failed", description: "Could not process database maintenance.", variant: "destructive" });
    } finally {
      setCleaningUp(false);
    }
  };

  const handleGenAIReport = async () => {
    const notes = logs.filter(l => l.handoverNotes).map(l => `${l.userName}: ${l.handoverNotes}`);
    if (notes.length === 0) {
      toast({ title: "Insufficient Data", description: "No notes available to synthesize today.", variant: "destructive" });
      return;
    }
    setSummarizing(true);
    try {
      const result = await summarizeHandoverNotes({
        handoverNotes: notes,
        startDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setAiSummary(result);
      toast({ title: "Intelligence Ready", description: "Executive summary generated." });
    } catch (err) {
      toast({ title: "AI Synthesis Error", description: "Failed to process handovers.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">PulseLog Command Center</span>
          </div>
          <h1 className="text-3xl font-headline font-extrabold text-foreground tracking-tight">Institutional Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time operational monitoring for <span className="font-bold text-primary">{organization?.name}</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl border-2">
                <Settings className="mr-2 h-4 w-4" />
                Config
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Institutional Configuration</DialogTitle>
                <DialogDescription>Manage geofencing and database maintenance.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Geofence Parameters
                  </h4>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-2xl border">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Locked Center</p>
                      <p className="text-sm font-mono">{organization?.latitude ? `${organization.latitude.toFixed(4)}, ${organization.longitude?.toFixed(4)}` : "Pending"}</p>
                    </div>
                  </div>
                  <Button onClick={handleSetPerimeter} disabled={settingLocation} variant="outline" className="w-full h-10 rounded-xl">
                    {settingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                    Synchronize GPS Perimeter
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Database className="h-3 w-3" /> Database Retention
                  </h4>
                  <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/10">
                    <p className="text-[10px] text-destructive font-bold leading-tight uppercase mb-2">Caution: Institutional Purge</p>
                    <p className="text-xs text-muted-foreground mb-4">Clearing records older than 30 days keeps the system fast and compliant with temporary data storage protocols.</p>
                    <Button 
                      onClick={handleCleanupOldLogs} 
                      disabled={cleaningUp} 
                      variant="destructive" 
                      className="w-full h-10 rounded-xl"
                    >
                      {cleaningUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                      Purge Legacy Logs (&gt;30 Days)
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Link href={`/dashboard/admin/terminal`} target="_blank">
            <Button variant="outline" size="sm" className="rounded-xl border-2">
              <Monitor className="mr-2 h-4 w-4" />
              Terminal
            </Button>
          </Link>
          <Button onClick={handleGenAIReport} size="sm" disabled={summarizing || logs.length === 0} className="rounded-xl shadow-lg bg-primary hover:bg-primary/90">
            {summarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Synthesize Handovers
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-[#002B5B] text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Users className="h-5 w-5 opacity-60" />
              <Badge className="bg-white/20 text-[9px] uppercase">Live</Badge>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-1">Personnel On-Site</p>
            <h3 className="text-4xl font-black tracking-tighter">{stats.totalOnSite}</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border-l-4 border-l-destructive">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Clock className="h-5 w-5 text-destructive" />
              <Badge variant="destructive" className="text-[9px] uppercase">Compliance</Badge>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Arrival Infractions</p>
            <h3 className="text-4xl font-black tracking-tighter text-destructive">{stats.lateArrivals}</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <ArrowUpRight className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Early Departures</p>
            <h3 className="text-4xl font-black tracking-tighter text-amber-500">{stats.earlyDepartures}</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Smile className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Institutional Morale</p>
            <h3 className="text-4xl font-black tracking-tighter text-primary">{stats.avgMood} <span className="text-lg opacity-40 font-bold">/ 3.0</span></h3>
          </CardContent>
        </Card>
      </div>

      {aiSummary && (
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary/10 via-background to-background animate-in fade-in slide-in-from-top-4">
          <CardHeader className="border-b bg-primary/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrainCircuit className="h-6 w-6 text-primary" />
                <CardTitle className="text-lg font-headline font-bold">Executive Intelligence Synthesis</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-primary/20 bg-white">REPORTS ENGINE 2.5</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Operational Summary</h4>
                  <p className="text-lg leading-relaxed text-foreground font-medium">{aiSummary.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/40 rounded-2xl border">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Overall Sentiment</h4>
                    <Badge className={cn(
                      "text-[10px] font-bold uppercase",
                      aiSummary.overallSentiment === 'positive' && "bg-green-600",
                      aiSummary.overallSentiment === 'negative' && "bg-destructive",
                      aiSummary.overallSentiment === 'neutral' && "bg-slate-500",
                      aiSummary.overallSentiment === 'mixed' && "bg-amber-600",
                    )}>
                      {aiSummary.overallSentiment}
                    </Badge>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-2xl border">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Well-being Trends</h4>
                    <ul className="space-y-1">
                      {aiSummary.staffWellbeingTrends.slice(0, 2).map((trend, i) => (
                        <li key={i} className="text-[11px] font-medium">• {trend}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-destructive/5 p-6 rounded-3xl border border-destructive/20 h-full">
                  <div className="flex items-center gap-2 mb-4 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <h4 className="text-[10px] font-bold uppercase tracking-widest">Critical Alert Vector</h4>
                  </div>
                  <ul className="space-y-3">
                    {aiSummary.criticalIssues.map((issue, idx) => (
                      <li key={idx} className="text-xs font-bold leading-tight pl-3 border-l-2 border-destructive">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-headline font-bold flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            Active Presence Stream
          </h2>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => <Card key={i} className="h-48 animate-pulse bg-muted/30" />)
          ) : logs.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] bg-card/50">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-10" />
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">No verified arrivals for {format(new Date(), 'MMM do')}</p>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className={cn(
                "group relative transition-all rounded-2xl border-none shadow-sm hover:shadow-md",
                log.clockOutTime ? "bg-muted/30 opacity-70" : "bg-card ring-1 ring-primary/5"
              )}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDeleteLog(log.id)}
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-sm border border-primary/10">
                      {log.userName.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold tracking-tight">{log.userName}</CardTitle>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{log.userDepartment}</p>
                    </div>
                  </div>
                  {log.status === 'late' && <Badge variant="destructive" className="text-[8px] h-4 uppercase">Late</Badge>}
                </CardHeader>
                <CardContent className="p-5 pt-4 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
                    <div className="text-center">
                      <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">In</p>
                      <p className="text-xs font-mono font-bold">{log.clockInTime?.substring(0, 5) || '--:--'}</p>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Out</p>
                      <p className="text-xs font-mono font-bold">{log.clockOutTime?.substring(0, 5) || '--:--'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {log.clockOutTime ? (
                        <div className="flex gap-0.5">
                          {Array(log.moodRating || 0).fill(0).map((_, i) => (
                            <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary" />
                          ))}
                        </div>
                      ) : (
                        <span className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-widest">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          On-Site
                        </span>
                      )}
                    </div>
                    <Badge variant="ghost" className="text-[9px] uppercase opacity-40">Verified</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
