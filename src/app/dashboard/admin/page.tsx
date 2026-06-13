
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
  setDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  UserCheck,
  BookOpen,
  Zap,
  Trash2,
  Edit2,
  Search,
  ArrowRight,
  BarChart3,
  LineChart
} from "lucide-react";
import { format, subDays, parse, isAfter, startOfDay } from "date-fns";
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
import {
  Bar,
  BarChart,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell
} from "recharts";

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
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Manual Attendance & Editing State
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [manualTime, setManualTime] = useState(format(new Date(), "HH:mm"));
  const [manualType, setManualType] = useState<"in" | "out">("in");
  const [isLoggingManual, setIsLoggingManual] = useState(false);
  
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [isUpdatingShift, setIsUpdatingShift] = useState(false);

  // Memoize Query references
  const staffQuery = useMemo(() => {
    if (!profile?.organizationId || !db) return null;
    return query(collection(db, "users"), where("organizationId", "==", profile.organizationId));
  }, [db, profile?.organizationId]);

  const { data: allStaff } = useCollection<UserProfile>(staffQuery);

  const historyQuery = useMemo(() => {
    if (!profile?.organizationId || !db) return null;
    return query(
      collection(db, "attendance_logs"),
      where("organizationId", "==", profile.organizationId),
      orderBy("date", "desc"),
      limit(200) // Increase limit for month analytics
    );
  }, [db, profile?.organizationId]);

  const { data: historyLogs, loading: historyLoading } = useCollection<AttendanceLog>(historyQuery);

  const todayLogsQuery = useMemo(() => {
    if (!profile?.organizationId || !db) return null;
    const today = format(new Date(), 'yyyy-MM-dd');
    return query(
      collection(db, "attendance_logs"),
      where("organizationId", "==", profile.organizationId),
      where("date", "==", today)
    );
  }, [db, profile?.organizationId]);

  useEffect(() => {
    if (!todayLogsQuery) return;

    const unsubscribe = onSnapshot(todayLogsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceLog[];
      setLogs(data);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [todayLogsQuery]);

  const stats = {
    totalOnSite: logs.filter(l => !l.clockOutTime).length,
    lateArrivals: logs.filter(l => l.status === 'late').length,
    totalOvertime: logs.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0),
    avgMood: logs.filter(l => l.moodRating).length > 0 
      ? (logs.reduce((acc, curr) => acc + (curr.moodRating || 0), 0) / logs.filter(l => l.moodRating).length).toFixed(1)
      : "N/A"
  };

  const hasLocation = !!(organization?.latitude && organization?.longitude);

  const filteredHistory = useMemo(() => {
    if (!historyLogs) return [];
    return historyLogs.filter(log => 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userDepartment.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [historyLogs, searchTerm]);

  // Analytics Data Preparation
  const analyticsData = useMemo(() => {
    if (!historyLogs || historyLogs.length === 0) return { attendance: [], mood: [], overtime: [] };

    const dailyStats: Record<string, { date: string, present: number, late: number, moodTotal: number, moodCount: number, overtime: number }> = {};
    
    // Process last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    last30Days.forEach(d => {
      dailyStats[d] = { date: d, present: 0, late: 0, moodTotal: 0, moodCount: 0, overtime: 0 };
    });

    historyLogs.forEach(log => {
      if (dailyStats[log.date]) {
        dailyStats[log.date].present += 1;
        if (log.status === 'late') dailyStats[log.date].late += 1;
        if (log.moodRating) {
          dailyStats[log.date].moodTotal += log.moodRating;
          dailyStats[log.date].moodCount += 1;
        }
        dailyStats[log.date].overtime += (log.overtimeMinutes || 0);
      }
    });

    return {
      attendance: Object.values(dailyStats).map(d => ({
        date: format(parse(d.date, 'yyyy-MM-dd', new Date()), 'MMM dd'),
        present: d.present,
        late: d.late
      })),
      mood: Object.values(dailyStats).map(d => ({
        date: format(parse(d.date, 'yyyy-MM-dd', new Date()), 'MMM dd'),
        avgMood: d.moodCount > 0 ? parseFloat((d.moodTotal / d.moodCount).toFixed(2)) : null
      })).filter(d => d.avgMood !== null),
      overtime: Object.values(dailyStats).map(d => ({
        date: format(parse(d.date, 'yyyy-MM-dd', new Date()), 'MMM dd'),
        minutes: d.overtime
      })).filter(d => d.minutes > 0)
    };
  }, [historyLogs]);

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
        const existingIn = logs.find(l => l.userId === selectedStaffId && !l.clockOutTime);
        if (existingIn) {
          toast({ title: "Protocol Violation", description: "Personnel is already logged in.", variant: "destructive" });
          setIsLoggingManual(false);
          return;
        }

        const startThreshold = parse(staffMember.shiftStart || "08:00", 'HH:mm', new Date());
        const actualIn = parse(manualTime, 'HH:mm', new Date());
        const status = isAfter(actualIn, startThreshold) ? 'late' : 'on-time';

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
          manualOverride: true,
          status: 'present'
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

  const handleUpdateShift = async () => {
    if (!editingStaff || !db || isUpdatingShift) return;
    setIsUpdatingShift(true);
    try {
      await updateDoc(doc(db, "users", editingStaff.uid), {
        shiftStart: editingStaff.shiftStart,
        shiftEnd: editingStaff.shiftEnd,
        department: editingStaff.department
      });
      toast({ title: "Shift Corrected", description: `Protocol updated for ${editingStaff.name}` });
      setEditingStaff(null);
    } catch (err) {
      toast({ title: "Correction Failed", description: "Data sync error.", variant: "destructive" });
    } finally {
      setIsUpdatingShift(false);
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
    const confirmCleanup = window.confirm("CAUTION: PulseLog Retention Protocol. This will permanently delete records older than 30 days. Proceed?");
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
                Digital Security Ledger
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle>Administrative Override Protocol</DialogTitle>
                <DialogDescription>Manually log attendance or correct forgotten departures.</DialogDescription>
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
                        <SelectItem value="in">Manual Arrival</SelectItem>
                        <SelectItem value="out">Correct Departure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Override Time</Label>
                    <Input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} className="rounded-xl h-11" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleManualAttendance} disabled={isLoggingManual || !selectedStaffId} className="w-full h-11 rounded-xl">
                  {isLoggingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                  Finalize Log Entry
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
                    {!hasLocation && <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
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
                    <History className="h-3 w-3" /> Data Retention Protocol
                  </h4>
                  <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/10">
                    <p className="text-[10px] text-destructive font-bold leading-tight uppercase mb-2">Reset Cycle (30 Days)</p>
                    <p className="text-xs text-muted-foreground mb-4">Clearing records older than 30 days is standard operational maintenance.</p>
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

          <Link href={hasLocation ? `/dashboard/admin/terminal` : "#"} onClick={(e) => {
            if (!hasLocation) {
              e.preventDefault();
              toast({ title: "Terminal Locked", description: "You must set site coordinates in Config first.", variant: "destructive" });
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

      <Tabs defaultValue="live" className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-full md:w-auto">
            <TabsTrigger value="live" className="rounded-lg px-6 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Presence
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-6 flex items-center gap-2">
              <History className="h-4 w-4" />
              Full History (30 Days)
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg px-6 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance Analytics
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter personnel..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl h-10"
            />
          </div>
        </div>

        <TabsContent value="live" className="m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => <Card key={i} className="h-48 animate-pulse bg-muted/30 rounded-2xl" />)
            ) : logs.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] bg-card/50">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-10" />
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">No active logs for today</p>
              </div>
            ) : (
              logs.filter(l => l.userName.toLowerCase().includes(searchTerm.toLowerCase())).map((log) => {
                const staffMember = allStaff?.find(s => s.uid === log.userId);
                return (
                  <Card key={log.id} className={cn(
                    "group relative transition-all rounded-2xl border-none shadow-sm hover:shadow-md",
                    log.clockOutTime ? "bg-muted/30 opacity-70" : "bg-card ring-1 ring-primary/5"
                  )}>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => staffMember && setEditingStaff(staffMember)}
                        className="h-7 w-7 text-primary hover:bg-primary/10 rounded-lg"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteLog(log.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                        {log.manualOverride && <Badge variant="outline" className="text-[8px] h-4 uppercase border-primary text-primary">Override</Badge>}
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
                        <div className="flex items-center gap-1">
                          <Badge variant="ghost" className="text-[9px] uppercase opacity-40 px-0">Verified</Badge>
                          <p className="text-[9px] font-mono text-muted-foreground opacity-60">({staffMember?.shiftStart}-{staffMember?.shiftEnd})</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="m-0">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-card">
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Staff</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Shift Window</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Handover</th>
                      <th className="px-6 py-4 text-right pr-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyLoading ? (
                      <tr><td colSpan={6} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></td></tr>
                    ) : filteredHistory.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-20 opacity-40">No records found.</td></tr>
                    ) : (
                      filteredHistory.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/5 group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-foreground">{log.userName}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{log.userDepartment}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{log.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 font-mono text-xs">
                              {log.clockInTime?.substring(0, 5)} <ArrowRight className="h-3 w-3 opacity-40" /> {log.clockOutTime?.substring(0, 5) || '??:??'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={cn(
                              "text-[8px] uppercase font-bold",
                              log.status === 'late' && "border-destructive text-destructive",
                              log.status === 'overtime' && "border-green-600 text-green-600",
                              !log.clockOutTime && "animate-pulse border-amber-500 text-amber-500"
                            )}>
                              {log.status.replace('-', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <p className="text-xs text-muted-foreground truncate" title={log.handoverNotes || ""}>
                              {log.handoverNotes || "--"}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteLog(log.id)}
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-6 md:p-8">
              <CardHeader className="px-0 pt-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <LineChart className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold">Attendance Velocity</CardTitle>
                </div>
                <CardDescription>Daily present vs. late arrivals (Last 30 Days)</CardDescription>
              </CardHeader>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={analyticsData.attendance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      minTickGap={30}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                    <Line type="monotone" dataKey="present" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Total Presence" />
                    <Line type="monotone" dataKey="late" stroke="hsl(var(--destructive))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Late Arrivals" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-6 md:p-8">
              <CardHeader className="px-0 pt-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Smile className="h-5 w-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-xl font-bold">Morale Consistency</CardTitle>
                </div>
                <CardDescription>Average mood rating (1.0 - 3.0 scale)</CardDescription>
              </CardHeader>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={analyticsData.mood}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={[1, 3]}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line type="stepAfter" dataKey="avgMood" stroke="hsl(var(--accent))" strokeWidth={4} dot={{ r: 4, fill: 'hsl(var(--accent))' }} name="Avg Mood" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-6 md:p-8 lg:col-span-2">
              <CardHeader className="px-0 pt-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-xl font-bold">Overtime Heatmap</CardTitle>
                </div>
                <CardDescription>Aggregate overtime minutes per day</CardDescription>
              </CardHeader>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.overtime}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      minTickGap={20}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="minutes" name="Minutes" radius={[6, 6, 0, 0]}>
                      {analyticsData.overtime.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.minutes > 60 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Institutional Correction</DialogTitle>
            <DialogDescription>Adjust shift windows or departments for personnel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personnel</Label>
              <Input value={editingStaff?.name || ""} disabled className="rounded-xl h-11 opacity-50" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Department</Label>
              <Input 
                value={editingStaff?.department || ""} 
                onChange={e => setEditingStaff(p => p ? {...p, department: e.target.value} : null)} 
                className="rounded-xl h-11" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Start Time</Label>
                <Input type="time" value={editingStaff?.shiftStart || "08:00"} onChange={e => setEditingStaff(p => p ? {...p, shiftStart: e.target.value} : null)} className="rounded-xl h-11" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">End Time</Label>
                <Input type="time" value={editingStaff?.shiftEnd || "17:00"} onChange={e => setEditingStaff(p => p ? {...p, shiftEnd: e.target.value} : null)} className="rounded-xl h-11" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateShift} disabled={isUpdatingShift} className="w-full h-11 rounded-xl">
              {isUpdatingShift ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize Correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
