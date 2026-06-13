
"use client";

import { useState, useEffect, useMemo } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore, useCollection } from "@/firebase";
import { 
  doc, 
  setDoc, 
  query, 
  where, 
  collection, 
  getDocs, 
  limit, 
  orderBy,
  Timestamp 
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Clock, 
  ArrowRight, 
  Smile, 
  Meh, 
  Frown, 
  Loader2, 
  CheckCircle2,
  ShieldCheck,
  MapPin,
  LocateFixed,
  ShieldX,
  Briefcase,
  BrainCircuit,
  Heart,
  History,
  CalendarDays,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMinutes, parse, isToday } from "date-fns";
import { AttendanceLog, MoodRating } from "@/lib/types";
import { cn, calculateDistance } from "@/lib/utils";

export default function StaffPage() {
  const { profile, organization, loading: authLoading } = usePulseLogAuth();
  const db = useFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeShift, setActiveShift] = useState<AttendanceLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [mood, setMood] = useState<MoodRating | null>(null);
  const [notes, setNotes] = useState("");
  const [locationStatus, setLocationStatus] = useState<'checking' | 'verified' | 'failed' | 'denied' | 'outside'>('checking');
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // History Query
  const historyQuery = useMemo(() => {
    if (!profile?.uid || !db) return null;
    return query(
      collection(db, "attendance_logs"),
      where("userId", "==", profile.uid),
      orderBy("date", "desc"),
      limit(10)
    );
  }, [db, profile?.uid]);

  const { data: historyLogs } = useCollection<AttendanceLog>(historyQuery);

  useEffect(() => {
    if (profile && organization) {
      fetchActiveShift();
      verifyLocation();
    }
  }, [profile, organization]);

  const verifyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('failed');
      return;
    }
    setLocationStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setCoords({ lat: userLat, lng: userLng });
        if (!organization?.latitude || !organization?.longitude) {
          setLocationStatus('verified');
          return;
        }
        const distance = calculateDistance(userLat, userLng, organization.latitude, organization.longitude);
        if (distance <= (organization.radiusInMeters || 200)) {
          setLocationStatus('verified');
        } else {
          setLocationStatus('outside');
        }
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true }
    );
  };

  const fetchActiveShift = async () => {
    if (!profile || !db) return;
    setLoading(true);
    // Find ANY shift that hasn't been clocked out
    const q = query(
      collection(db, "attendance_logs"),
      where("userId", "==", profile.uid),
      where("clockOutTime", "==", null),
      limit(1)
    );
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        setActiveShift({ id: snap.docs[0].id, ...snap.docs[0].data() } as AttendanceLog);
      } else {
        setActiveShift(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!profile || !db || locationStatus !== 'verified' || loading) {
      toast({ title: "Protocol Refused", description: "GPS verification and authentication sync required.", variant: "destructive" });
      return;
    }

    // Check if there is ALREADY an active shift
    if (activeShift) {
      toast({ title: "Sequence Error", description: "You must finalize your pending shift before starting a new one.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const timeStr = format(now, 'HH:mm:ss');
    
    const startTimeStr = profile.shiftStart || "08:00";
    const lateThreshold = parse(startTimeStr, 'HH:mm', now);
    const status = now > lateThreshold ? 'late' : 'on-time';

    const newLogRef = doc(collection(db, "attendance_logs"));
    const newLog: any = {
      id: newLogRef.id,
      userId: profile.uid,
      userName: profile.name,
      userDepartment: profile.department,
      organizationId: profile.organizationId,
      date: today,
      clockInTime: timeStr,
      clockOutTime: null,
      status: status,
      handoverNotes: null,
      moodRating: null,
      overtimeMinutes: 0,
      verifiedAt: now.toISOString(),
      verifiedLocation: coords,
    };

    try {
      await setDoc(newLogRef, newLog);
      setActiveShift(newLog as AttendanceLog);
      toast({ title: "Clocked In", description: `Arrival verified for ${today}.` });
    } catch (err) {
      toast({ title: "Sync Failure", description: "Failed to broadcast arrival.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift || !profile || !db || loading) return;
    
    const sanitizedNotes = notes.trim();
    if (!sanitizedNotes || !mood) {
      toast({ title: "Incomplete Log", description: "Handover notes and morale score are required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const now = new Date();
    const timeStr = format(now, 'HH:mm:ss');
    
    const endTimeStr = profile.shiftEnd || "17:00";
    const shiftEnd = parse(endTimeStr, 'HH:mm', now);
    
    let overtime = 0;
    let status = activeShift.status;

    if (organization?.overtimeEnabled) {
      if (now > shiftEnd) {
        overtime = differenceInMinutes(now, shiftEnd);
        status = 'overtime';
      } else if (differenceInMinutes(shiftEnd, now) > 5) {
        status = 'early-departure';
      }
    } else {
      if (differenceInMinutes(shiftEnd, now) > 5) {
        status = 'early-departure';
      } else {
        status = 'present';
      }
    }

    try {
      await setDoc(doc(db, "attendance_logs", activeShift.id), {
        clockOutTime: timeStr,
        status: status,
        moodRating: mood,
        handoverNotes: sanitizedNotes,
        overtimeMinutes: organization?.overtimeEnabled ? overtime : 0
      }, { merge: true });
      
      setActiveShift(null);
      setClockOutOpen(false);
      setNotes("");
      setMood(null);
      toast({ title: "Shift Finalized", description: "Operational intelligence synchronized." });
    } catch (err) {
      toast({ title: "Departure Error", description: "Failed to sync departure.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isPendingPrevious = activeShift && !isToday(new Date(activeShift.date));

  return (
    <div className="space-y-8 flex flex-col items-center max-w-4xl mx-auto pb-20">
      <div className="text-center space-y-2 w-full">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border border-primary/20">
          <ShieldCheck className="h-4 w-4" />
          PulseLog Staff Portal
        </div>
        <h1 className="text-4xl font-headline font-black text-foreground tracking-tight">Shift Lifecycle</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Main Controls */}
        <div className="space-y-6">
          <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem]">
            <div className={cn(
              "p-10 text-center text-white relative",
              isPendingPrevious ? "bg-amber-600" : "bg-[#002B5B]"
            )}>
              <div className="absolute top-6 left-6 opacity-5"><MapPin className="h-20 w-20" /></div>
              <div className="text-7xl font-mono font-black tracking-tighter mb-2">
                {format(currentDate, 'HH:mm')}
                <span className="text-2xl ml-2 opacity-40 font-bold">{format(currentDate, 'ss')}</span>
              </div>
              <p className="text-[12px] font-bold uppercase tracking-[0.4em] opacity-60">{format(currentDate, 'EEEE, MMMM do')}</p>
              
              {isPendingPrevious && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/30">
                  <AlertTriangle className="h-3 w-3" />
                  Incomplete Shift: {activeShift.date}
                </div>
              )}
            </div>

            <CardContent className="p-8 space-y-6">
              <div className={cn(
                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                locationStatus === 'verified' ? "bg-green-500/5 border-green-500/20 text-green-600" :
                locationStatus === 'checking' ? "bg-muted/50 border-muted text-muted-foreground" :
                "bg-destructive/5 border-destructive/20 text-destructive"
              )}>
                <div className="flex items-center gap-3">
                  {locationStatus === 'verified' ? <LocateFixed className="h-5 w-5" /> :
                   locationStatus === 'checking' ? <Loader2 className="h-5 w-5 animate-spin" /> :
                   <ShieldX className="h-5 w-5" />}
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                    {locationStatus === 'verified' ? "Within Perimeter" :
                     locationStatus === 'checking' ? "Locating..." :
                     "Outside Fence"}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold uppercase border" onClick={verifyLocation}>Retry</Button>
              </div>

              {!activeShift ? (
                <Button 
                  className={cn(
                    "w-full h-32 rounded-3xl flex flex-col gap-2 shadow-xl transition-all", 
                    locationStatus === 'verified' ? "bg-primary hover:scale-[1.02]" : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                  onClick={handleClockIn}
                  disabled={loading || locationStatus !== 'verified'}
                >
                  {loading ? <Loader2 className="animate-spin h-8 w-8" /> : (
                    <>
                      <Clock className="h-8 w-8" />
                      <span className="text-xl font-bold uppercase tracking-tight">Begin New Shift</span>
                      <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Target: {profile?.shiftStart} - {profile?.shiftEnd}</span>
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className={cn(
                    "rounded-3xl p-6 flex items-center justify-between border",
                    isPendingPrevious ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center",
                        isPendingPrevious ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                      )}><Clock className="h-6 w-6" /></div>
                      <div>
                        <p className={cn("text-[10px] uppercase font-bold tracking-[0.2em] mb-1", isPendingPrevious ? "text-amber-600" : "text-green-600")}>
                          {isPendingPrevious ? `Incomplete: ${activeShift.date}` : "Active Session"}
                        </p>
                        <p className="text-2xl font-black font-mono">{activeShift.clockInTime?.substring(0, 5)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className={cn(
                      "w-full h-28 rounded-3xl flex flex-col gap-2 shadow-xl transition-all",
                      isPendingPrevious ? "bg-amber-600 hover:bg-amber-700" : "bg-accent hover:bg-accent/90"
                    )}
                    onClick={() => setClockOutOpen(true)}
                    disabled={loading}
                  >
                    <ArrowRight className="h-8 w-8" />
                    <span className="text-xl uppercase tracking-tight">Finalize Departure</span>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Required for data sync</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Shift History */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-none shadow-sm h-full bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">Recent History</CardTitle>
              </div>
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">Last 10 Logs</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {!historyLogs || historyLogs.length === 0 ? (
                  <div className="p-20 text-center opacity-20">
                    <CalendarDays className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No previous logs found</p>
                  </div>
                ) : (
                  historyLogs.map((log) => (
                    <div key={log.id} className="p-6 hover:bg-muted/10 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-muted flex flex-col items-center justify-center">
                          <span className="text-[8px] font-bold uppercase opacity-60">{format(new Date(log.date), 'MMM')}</span>
                          <span className="text-sm font-black leading-none">{format(new Date(log.date), 'dd')}</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-none mb-1">{log.status.replace('-', ' ').toUpperCase()}</p>
                          <p className="text-[10px] font-mono opacity-60">{log.clockInTime?.substring(0, 5)} - {log.clockOutTime?.substring(0, 5) || '??:??'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.moodRating && (
                          <div className="flex gap-0.5">
                            {Array(log.moodRating).fill(0).map((_, i) => (
                              <div key={i} className="h-1 w-1 rounded-full bg-primary" />
                            ))}
                          </div>
                        )}
                        {!log.clockOutTime && <Badge variant="destructive" className="text-[8px] animate-pulse">PENDING</Badge>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-headline font-black">Finalize Log</DialogTitle>
            <DialogDescription className="text-sm font-medium">Complete operational summary for {activeShift?.date}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-primary" />
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Shift Morale</Label>
              </div>
              <div className="flex justify-between gap-3">
                {[
                  { v: 3, label: 'Smooth', icon: Smile, color: 'text-green-600', bg: 'bg-green-600/10', border: 'border-green-600' },
                  { v: 2, label: 'Normal', icon: Meh, color: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600' },
                  { v: 1, label: 'Stress', icon: Frown, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600' }
                ].map((m) => (
                  <button 
                    key={m.v}
                    onClick={() => setMood(m.v as MoodRating)}
                    className={cn("flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", mood === m.v ? `${m.bg} ${m.border}` : "bg-muted/50 border-transparent grayscale opacity-40 hover:grayscale-0 hover:opacity-100")}
                  >
                    <m.icon className={cn("h-8 w-8", mood === m.v ? m.color : "text-muted-foreground")} />
                    <span className="text-[8px] font-bold uppercase">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Handover Summary</Label>
              </div>
              <Textarea 
                placeholder="Critical observations, tasks, or issues..." 
                className="min-h-[140px] rounded-2xl p-4 bg-muted/30 border-none text-sm font-medium" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </div>
            <Button className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl" disabled={!mood || !notes || loading} onClick={handleClockOut}>
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize Sync"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
