
"use client";

import { useState, useEffect, useMemo } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch,
  setDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  History,
  TrendingUp,
  PlusCircle,
  Trash2,
  Database,
  UserCheck,
  BookOpen,
  Zap,
  ShieldAlert
} from "lucide-react";
import { format, subDays, parse } from "date-fns";
import { AttendanceLog, UserProfile } from "@/lib/types";
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
  const [cleaningUp, setCleaningUp] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const { toast } = useToast();

  // Manual Attendance State (Inclusion Protocol)
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [manualTime, setManualTime] = useState(format(new Date(), "HH:mm"));
  const [manualType, setManualType] = useState<"in" | "out">("in");
  const [isLoggingManual, setIsLoggingManual] = useState(false);

  // Fetch all staff for manual select
  const staffQuery = useMemo(() => {
    if (!profile?.organizationId) return null;
    return query(collection(db, "users"), where("organizationId", "==", profile.organizationId));
  }, [db, profile?.organizationId]);
  const { data: allStaff } = useCollection<UserProfile>(staffQuery);

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
    totalOvertime: logs.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0),
    avgMood: logs.filter(l => l.moodRating).length > 0 
      ? (logs.reduce((acc, curr) => acc + (curr.moodRating || 0), 0) / logs.filter(l => l.moodRating).length).toFixed(1)
      : "N/A"
  };

  const hasLocation = !!(organization?.latitude && organization?.longitude);

  const handleManualAttendance = async () => {
    if (!selectedStaffId || !db || !profile?.organizationId || isLoggingManual) return;
    setIsLoggingManual(true);
    const staffMember = allStaff?.find(s => s.uid === selectedStaffId);
    if (!staffMember) {
      setIsLoggingManual(false);
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const timeStr = `${manualTime}:00`;

    try {
      if (manualType === "in") {
        const existingIn = logs.find(l => l.userId === selectedStaffId);
        if (existingIn) {
          toast({ title: "Protocol Violation", description: "Personnel is already logged in for today.", variant: "destructive" });
          setIsLoggingManual(false);
          return;
        }

        const startThreshold = parse(staffMember.shiftStart || "08:00", 'HH:mm', new Date());
        const actualIn = parse(manualTime, 'HH:mm', new Date());
        const status = actualIn > startThreshold ? 'late' : 'on-time';

        const newLogRef = doc(collection(db, "attendance_logs"));
        await setDoc(newLogRef, {
          id: newLogRef.id,
          userId: staffMember.uid,
          userName: staffMember.name,
          userDepartment: staffMember.department,
          organizationId: profile.organizationId,
          date: today,
          clockInTime: timeStr,
          clockOutTime: null,
          status: status,
          manualOverride: true,
          verifiedAt: new Date().toISOString()
        });
        toast({ title: "Arrival Logged", description: `Supervisor override for ${staffMember.name}` });
      } else {
        const existingLog = logs.find(l => l.userId === selectedStaffId && !l.clockOutTime);
        if (!existingLog) {
          toast({ title: "No Active Session", description: "Staff is not currently clocked in.", variant: "destructive" });
          setIsLoggingManual(false);
          return;
        }
        await updateDoc(doc(db, "attendance_logs", existingLog.id), {
          clockOutTime: timeStr,
          manualOverride: true
        });
        toast({ title: "Departure Logged", description: `Supervisor override for ${staffMember.name}` });
      }
      setManualOpen(false);
      setSelectedStaffId("");
    } catch (err) {
      toast({ title: "Error", description: "Manual log failed.", variant: "destructive" });
    } finally {
      setIsLoggingManual(false);
    }
  };

  const handleToggleOvertime = async (enabled: boolean) => {
    if (!organization?.id || !db || updatingConfig) return;
    setUpdatingConfig(true);
    try {
      await updateDoc(doc(db, "organizations", organization.id), {
        overtimeEnabled: enabled
      });
      toast({ 
        title: enabled ? "Overtime Protocol Active" : "Overtime Protocol Disabled", 
        description: `Rewards engine ${enabled ? 'engaged' : 'halted'}.` 
      });
    } catch (err) {
      toast({ title: "Configuration Error", description: "Failed to update protocol.", variant: "destructive" });
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleSetPerimeter = () => {
    if (!navigator.geolocation) {
      toast({ title: "Unsupported", description: "Browser geolocation not available.", variant: "destructive" });
      return;
    }
    if (settingLocation) return;
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
    const confirmDelete = window.confirm("SECURITY ALERT: This will permanently remove this record. Are you sure?");
    if (!confirmDelete) return;
    
    try {
      await deleteDoc(doc(db, "attendance_logs", logId));
      toast({ title: "Record Deleted", description: "The log has been removed." });
    } catch (err) {
      toast({ title: "Error", description: "Deletion failed.", variant: "destructive" });
    }
  };

  const handleCleanupOldLogs = async () => {
    if (!db || !profile?.organizationId || cleaningUp) return;
    const confirmCleanup = window.confirm("CAUTION: This will permanently delete records older than 30 days. Proceed?");
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
      toast({ title: "Cleanup Failed", description: "Maintenance error.", variant: "destructive" });
    } finally {
      setCleaningUp(false);
    }
  };

  const handleGenAIReport = async () => {
    if (summarizing) return;
    const notes = logs.filter(l => l.handoverNotes).map(l => `${l.userName}: ${l.handoverNotes}`);
    if (notes.length === 0) {
      toast({ title: "Insufficient Data", description: "No notes available today.", variant: "destructive" });
      return;
    }
    setSummarizing(true);
    try {
      const result = await summarizeHandoverNotes({
        handoverNotes: notes,
        startDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setAiSummary(result);
      toast({ title: "Intelligence Ready", description: "Operational summary generated." });
    } catch (err) {
      toast({ title: "AI Synthesis Error", description: "Failed to process notes.", variant: "destructive" });
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
          <h1 className="text-3xl font-headline font-extrabold text-foreground tracking-tight">Operational Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Institutional workforce monitoring for <span className="font-bold text-primary">{organization?.name}</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl border-2 bg-primary/5 border-primary/20 hover:bg-primary/10">
                <BookOpen className="mr-2 h-4 w-4 text-primary" />
                Digital Ledger
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle>Administrative Protocol</DialogTitle>
                <DialogDescription>Manually log attendance for personnel without smart devices.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Select Personnel</Label>
                  <Select onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Search by name..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allStaff?.map(s => (
                        <SelectItem key={s.uid} value={s.uid}>{s.name} ({s.department})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Protocol Type</Label>
                    <Select onValueChange={(v: any) => setManualType(v)} defaultValue="in">
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Arrival (In)</SelectItem>
                        <SelectItem value="out">Departure (Out)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Log Time</Label>
                    <Input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="rounded-xl h-11" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleManualAttendance} disabled={isLoggingManual || !selectedStaffId} className="w-full h-11 rounded-xl">
                  {isLoggingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                  Finalize Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl border-2">
                <Settings className="mr-2 h-4 w-4" />
                Config
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle>System Configuration</DialogTitle>
                <DialogDescription>Manage operational protocols and maintenance.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/20">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Zap className="h-3 w-3 text-amber-500" /> Overtime Rewards
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Enable tracking and incentives for overtime.</p>
                    </div>
                    <Switch 
                      checked={!!organization?.overtimeEnabled} 
                      onCheckedChange={handleToggleOvertime}
                      disabled={updatingConfig}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Geofence Parameters
                  </h4>
                  <div className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border",
                    hasLocation ? "bg-muted/50 border-border" : "bg-destructive/5 border-destructive/20"
                  )}>
                    {!hasLocation && <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Locked Center</p>
                      <p className={cn("text-sm font-mono", !hasLocation && "text-destructive font-bold")}>
                        {hasLocation ? `${organization?.latitude?.toFixed(4)}, ${organization?.longitude?.toFixed(4)}` : "REQUIRED: Set Location"}
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleSetPerimeter} disabled={settingLocation} variant="outline" className="w-full h-10 rounded-xl">
                    {settingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                    Lock Site Perimeter
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Database className="h-3 w-3" /> Data Retention
                  </h4>
                  <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/10">
                    <p className="text-[10px] text-destructive font-bold leading-tight uppercase mb-2">Caution: Database Purge</p>
                    <p className="text-xs text-muted-foreground mb-4">Clearing records older than 30 days maintains system performance.</p>
                    <Button 
                      onClick={handleCleanupOldLogs} 
                      disabled={cleaningUp} 
                      variant="destructive" 
                      className="w-full h-10 rounded-xl"
                    >
                      {cleaningUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                      Purge Logs (&gt;30 Days)
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Link href={hasLocation ? `/dashboard/admin/terminal` : "#"} onClick={(e) => {
            if (!hasLocation) {
              e.preventDefault();
              toast({ title: "Terminal Locked", description: "You must set the site coordinates in Config first.", variant: "destructive" });
            }
          }}>
            <Button variant="outline" size="sm" className={cn("rounded-xl border-2", !hasLocation && "opacity-50 grayscale")}>
              <Monitor className="mr-2 h-4 w-4" />
              Terminal
            </Button>
          </Link>
          <Button onClick={handleGenAIReport} size="sm" disabled={summarizing || logs.length === 0} className="rounded-xl shadow-lg bg-primary hover:bg-primary/90">
            {summarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Synthesize Daily Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-none shadow-sm bg-[#002B5B] text-white rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Users className="h-5 w-5 opacity-60" />
              <Badge className="bg-white/20 text-[9px] uppercase">Active</Badge>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-1">Personnel On-Site</p>
            <h3 className="text-4xl font-black tracking-tighter">{stats.totalOnSite}</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card border-l-4 border-l-destructive rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <Badge variant="destructive" className="text-[9px] uppercase">Compliance</Badge>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Late Arrivals</p>
            <h3 className="text-4xl font-black tracking-tighter text-destructive">{stats.lateArrivals}</h3>
          </CardContent>
        </Card>

        {organization?.overtimeEnabled && (
          <Card className="border-none shadow-sm bg-card border-l-4 border-l-green-600 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <Badge className="bg-green-600/10 text-green-600 text-[9px] uppercase border-green-600/20">Reward Metrics</Badge>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Overtime (Mins)</p>
              <h3 className="text-4xl font-black tracking-tighter text-green-600">{stats.totalOvertime}</h3>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-sm bg-card border-l-4 border-l-primary rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <Smile className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Morale Score</p>
            <h3 className="text-4xl font-black tracking-tighter text-primary">{stats.avgMood} <span className="text-lg opacity-40 font-bold">/ 3.0</span></h3>
          </CardContent>
        </Card>
      </div>

      {aiSummary && (
        <Card className="border-none shadow-xl bg-gradient-to-br from-primary/10 via-background to-background animate-in fade-in slide-in-from-top-4 rounded-[2.5rem]">
          <CardHeader className="border-b bg-primary/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrainCircuit className="h-6 w-6 text-primary" />
                <CardTitle className="text-lg font-headline font-bold">Executive Intelligence Synthesis</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-primary/20 bg-white">GENKIT ENGINE 1.0</Badge>
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
            Institutional Presence Stream
          </h2>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => <Card key={i} className="h-48 animate-pulse bg-muted/30 rounded-2xl" />)
          ) : logs.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] bg-card/50">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-10" />
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">No active personnel logs for {format(new Date(), 'MMM do')}</p>
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
                  <div className="flex flex-col items-end gap-1">
                    {log.status === 'late' && <Badge variant="destructive" className="text-[8px] h-4 uppercase">Late</Badge>}
                    {organization?.overtimeEnabled && (log.overtimeMinutes || 0) > 0 && (
                      <Badge className="bg-green-600 text-white text-[8px] h-4 uppercase">
                        +{log.overtimeMinutes}m OT
                      </Badge>
                    )}
                    {log.manualOverride && <Badge variant="outline" className="text-[8px] h-4 uppercase border-primary/20 text-primary bg-primary/5">Manual</Badge>}
                  </div>
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
