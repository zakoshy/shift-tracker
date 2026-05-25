
"use client";

import { useState, useEffect } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore } from "@/firebase";
import { doc, setDoc, query, where, collection, getDocs, limit } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Info,
  BrainCircuit,
  Heart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMinutes, parse } from "date-fns";
import { AttendanceLog, MoodRating } from "@/lib/types";
import { cn, calculateDistance } from "@/lib/utils";

export default function StaffPage() {
  const { profile, organization, loading: authLoading } = usePulseLogAuth();
  const db = useFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceLog | null>(null);
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

  useEffect(() => {
    if (profile && organization) {
      fetchTodayAttendance();
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
          toast({ title: "Perimeter Check Failed", description: "You are outside the organization fence.", variant: "destructive" });
        }
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true }
    );
  };

  const fetchTodayAttendance = async () => {
    if (!profile || !db) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, "attendance_logs"),
      where("userId", "==", profile.uid),
      where("date", "==", today),
      limit(1)
    );
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        setAttendance({ id: snap.docs[0].id, ...snap.docs[0].data() } as AttendanceLog);
      } else {
        setAttendance(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!profile || !db || locationStatus !== 'verified') {
      toast({ title: "Security Alert", description: "GPS verification required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
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
      date: todayStr,
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
      setAttendance(newLog as AttendanceLog);
      toast({ title: status === 'late' ? "Arrival Noted (Late)" : "Clocked In", description: `Arrival verified at ${format(now, 'hh:mm a')}` });
    } catch (err) {
      toast({ title: "Error", description: "Log failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!attendance || !profile || !db) return;
    setLoading(true);
    const now = new Date();
    const timeStr = format(now, 'HH:mm:ss');
    
    const endTimeStr = profile.shiftEnd || "17:00";
    const shiftEnd = parse(endTimeStr, 'HH:mm', now);
    
    let overtime = 0;
    let status = attendance.status;

    if (now > shiftEnd) {
      overtime = differenceInMinutes(now, shiftEnd);
      status = 'overtime';
    } else if (differenceInMinutes(shiftEnd, now) > 5) {
      status = 'early-departure';
    }

    try {
      await setDoc(doc(db, "attendance_logs", attendance.id), {
        clockOutTime: timeStr,
        status: status,
        moodRating: mood,
        handoverNotes: notes,
        overtimeMinutes: overtime
      }, { merge: true });
      setAttendance(prev => prev ? { ...prev, clockOutTime: timeStr, moodRating: mood, handoverNotes: notes, status, overtimeMinutes: overtime } : null);
      setClockOutOpen(false);
      toast({ title: "Shift Finalized", description: "Operational notes synchronized." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="space-y-6 flex flex-col items-center max-w-lg mx-auto pb-12">
      <div className="text-center space-y-2 mb-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border border-primary/20">
          <ShieldCheck className="h-4 w-4" />
          Presence Protocol Active
        </div>
        <h1 className="text-4xl font-headline font-black text-foreground tracking-tight">Shift Sync</h1>
        <div className="flex items-center justify-center gap-3 bg-card p-3 rounded-2xl border shadow-sm">
          <Briefcase className="h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">Assigned Department</p>
            <p className="text-sm font-bold text-foreground leading-none">{profile?.department}</p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <Card className="shadow-[0_20px_60px_rgba(0,0,0,0.1)] border-none overflow-hidden rounded-[2.5rem]">
          <div className="bg-[#002B5B] p-10 text-center text-white relative">
            <div className="absolute top-6 left-6 opacity-5"><MapPin className="h-20 w-20" /></div>
            <div className="text-7xl font-mono font-black tracking-tighter mb-2">
              {format(currentDate, 'HH:mm')}
              <span className="text-2xl ml-2 opacity-40 font-bold">{format(currentDate, 'ss')}</span>
            </div>
            <p className="text-[12px] font-bold uppercase tracking-[0.4em] opacity-60">{format(currentDate, 'EEEE, MMMM do')}</p>
          </div>

          <CardContent className="p-10 space-y-8">
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
                  {locationStatus === 'verified' ? "Perimeter Verified" :
                   locationStatus === 'checking' ? "Scanning GPS..." :
                   locationStatus === 'outside' ? "Outside Fence" : "No GPS Sync"}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold uppercase border hover:bg-white" onClick={verifyLocation}>Recalibrate</Button>
            </div>

            {!attendance ? (
              <div className="space-y-6">
                <Button 
                  className={cn("w-full h-28 rounded-3xl flex flex-col gap-2 shadow-2xl transition-all", locationStatus === 'verified' ? "bg-primary shadow-primary/20 hover:scale-[1.02]" : "bg-muted text-muted-foreground opacity-60 cursor-not-allowed")}
                  onClick={handleClockIn}
                  disabled={loading || locationStatus !== 'verified'}
                >
                  {loading ? <Loader2 className="animate-spin h-8 w-8" /> : (
                    <>
                      <Clock className="h-8 w-8" />
                      <span className="text-xl font-bold uppercase tracking-tight">Authorize Arrival</span>
                      <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Shift: {profile?.shiftStart} - {profile?.shiftEnd}</span>
                    </>
                  )}
                </Button>
              </div>
            ) : attendance.clockOutTime ? (
              <div className="py-8 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-white shadow-xl ring-1 ring-green-500/20">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <div>
                  <h3 className="text-3xl font-headline font-black text-foreground">Shift Completed</h3>
                  {attendance.overtimeMinutes ? (
                    <Badge className="mt-2 bg-green-600">Reward Points: +{attendance.overtimeMinutes} OT</Badge>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-muted/30 p-6 rounded-3xl border flex flex-col items-center"><span className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Arrival</span><span className="text-2xl font-black font-mono">{attendance.clockInTime?.substring(0, 5)}</span></div>
                  <div className="bg-muted/30 p-6 rounded-3xl border flex flex-col items-center"><span className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Departure</span><span className="text-2xl font-black font-mono">{attendance.clockOutTime?.substring(0, 5)}</span></div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-green-600/5 rounded-3xl p-6 flex items-center justify-between border border-green-600/10">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-green-600/10 rounded-2xl flex items-center justify-center"><Clock className="h-7 w-7 text-green-600" /></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-green-600 mb-1">Session Active</p>
                      <p className="text-2xl font-black text-foreground font-mono">{attendance.clockInTime?.substring(0, 5)}</p>
                    </div>
                  </div>
                  {attendance.status === 'late' && <span className="h-6 px-3 flex items-center bg-destructive/10 text-destructive text-[10px] font-bold uppercase rounded-lg">Late Arrival</span>}
                </div>
                
                <div className="space-y-4">
                  <Button 
                    className="w-full h-28 rounded-3xl flex flex-col gap-2 bg-accent hover:bg-accent/90 shadow-xl text-accent-foreground font-bold transition-all"
                    onClick={() => setClockOutOpen(true)}
                    disabled={loading}
                  >
                    <ArrowRight className="h-8 w-8" />
                    <span className="text-xl uppercase tracking-tight">Finalize Departure</span>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Operational Protocol Required</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-headline font-black">Departure Log</DialogTitle>
            <DialogDescription className="text-sm font-medium">Log operational summaries and personal wellness.</DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-primary" />
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Shift Morale Score</Label>
              </div>
              <div className="flex justify-between gap-3">
                {[
                  { v: 3, label: 'Smooth', icon: Smile, color: 'text-green-600', bg: 'bg-green-600/10', border: 'border-green-600' },
                  { v: 2, label: 'Standard', icon: Meh, color: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600' },
                  { v: 1, label: 'Hectic', icon: Frown, color: 'text-red-600', bg: 'bg-red-600/10', border: 'border-red-600' }
                ].map((m) => (
                  <button 
                    key={m.v}
                    onClick={() => setMood(m.v as MoodRating)}
                    className={cn("flex-1 flex flex-col items-center gap-2 p-5 rounded-3xl border-2 transition-all", mood === m.v ? `${m.bg} ${m.border}` : "bg-muted/50 border-transparent grayscale opacity-40 hover:grayscale-0 hover:opacity-100")}
                  >
                    <m.icon className={cn("h-10 w-10", mood === m.v ? m.color : "text-muted-foreground")} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Operational Notes (Required)</Label>
              </div>
              <Textarea placeholder="Tasks completed, issues flagged, shift summary..." className="min-h-[160px] rounded-2xl p-4 bg-muted/30 border-none text-sm font-medium" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="w-full h-14 text-xl font-bold rounded-2xl shadow-2xl" disabled={!mood || !notes || loading} onClick={handleClockOut}>
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Sign Out & Sync"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
