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
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Clock, 
  ArrowRight, 
  Smile, 
  Meh, 
  Frown, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  LocateFixed,
  ShieldX,
  Stethoscope
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

        const distance = calculateDistance(
          userLat, 
          userLng, 
          organization.latitude, 
          organization.longitude
        );

        if (distance <= (organization.radiusInMeters || 200)) {
          setLocationStatus('verified');
        } else {
          setLocationStatus('outside');
          toast({ 
            title: "Outside Perimeter", 
            description: `You are currently ${(distance / 1000).toFixed(2)}km away from the facility.`, 
            variant: "destructive" 
          });
        }
      },
      (error) => {
        setLocationStatus('denied');
      },
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
    const snap = await getDocs(q);
    if (!snap.empty) {
      setAttendance({ id: snap.docs[0].id, ...snap.docs[0].data() } as AttendanceLog);
    } else {
      setAttendance(null);
    }
    setLoading(false);
  };

  const handleClockIn = async () => {
    if (!profile || !db || locationStatus !== 'verified') {
      toast({ title: "Security Failure", description: "GPS verification required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HH:mm:ss');
    
    const lateThreshold = new Date();
    lateThreshold.setHours(8, 0, 0);
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
      verifiedAt: now.toISOString(),
      verifiedLocation: coords,
    };

    try {
      await setDoc(newLogRef, newLog);
      setAttendance(newLog as AttendanceLog);
      toast({
        title: status === 'late' ? "Late Arrival Recorded" : "Clocked In",
        description: `Verified at ${format(now, 'hh:mm a')}`,
        variant: status === 'late' ? "destructive" : "default",
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to clock in", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!attendance || !profile || !db) return;
    setLoading(true);
    const now = new Date();
    const timeStr = format(now, 'HH:mm:ss');
    
    const earlyThreshold = new Date();
    earlyThreshold.setHours(17, 0, 0);
    let status = attendance.status;
    if (now < earlyThreshold) {
      status = 'early-departure';
    }

    try {
      await setDoc(doc(db, "attendance_logs", attendance.id), {
        clockOutTime: timeStr,
        status: status,
        moodRating: mood,
        handoverNotes: notes,
      }, { merge: true });
      
      setAttendance(prev => prev ? { ...prev, clockOutTime: timeStr, moodRating: mood, handoverNotes: notes, status } : null);
      setClockOutOpen(false);
      toast({
        title: "Shift Completed",
        description: "Handover secured and shift finalized.",
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to clock out", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="space-y-6 flex flex-col items-center max-w-lg mx-auto">
      <div className="text-center space-y-2 mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-2 border border-primary/20">
          <ShieldCheck className="h-3 w-3" />
          Secure Protocol
        </div>
        <h1 className="text-3xl font-headline font-bold text-foreground">Shift Verification</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground bg-muted/50 px-4 py-2 rounded-xl border">
          <Stethoscope className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-tight">Active Rotation: <span className="text-foreground">{profile?.department}</span></span>
        </div>
      </div>

      <div className="w-full">
        <Card className="shadow-2xl border-none overflow-hidden bg-card">
          <div className="bg-primary p-8 text-center text-primary-foreground relative">
            <div className="absolute top-4 left-4 opacity-10">
              <MapPin className="h-12 w-12" />
            </div>
            <div className="text-6xl font-mono font-bold tracking-tighter mb-1">
              {format(currentDate, 'hh:mm')}
              <span className="text-2xl ml-1 opacity-60">{format(currentDate, 'ss')}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">{format(currentDate, 'EEEE, MMMM do')}</p>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
              locationStatus === 'verified' ? "bg-green-500/10 border-green-500/20 text-green-600" :
              locationStatus === 'checking' ? "bg-muted border-muted-foreground/10 text-muted-foreground" :
              "bg-destructive/10 border-destructive/20 text-destructive"
            )}>
              <div className="flex items-center gap-3">
                {locationStatus === 'verified' ? <LocateFixed className="h-4 w-4" /> :
                 locationStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                 <ShieldX className="h-4 w-4" />}
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {locationStatus === 'verified' ? "Institutional Perimeter Locked" :
                   locationStatus === 'checking' ? "Acquiring GPS Signal..." :
                   locationStatus === 'denied' ? "GPS Access Denied" : 
                   locationStatus === 'outside' ? "Outside Geofence" : "GPS Signal Lost"}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase" onClick={verifyLocation}>
                Recalibrate
              </Button>
            </div>

            {!attendance ? (
              <div className="space-y-6">
                <Button 
                  className={cn(
                    "w-full h-24 text-xl rounded-2xl flex flex-col gap-1 shadow-lg transition-all",
                    locationStatus === 'verified' 
                      ? "bg-primary shadow-primary/20 hover:scale-[1.02]" 
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  )}
                  onClick={handleClockIn}
                  disabled={loading || locationStatus !== 'verified'}
                >
                  {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                    <>
                      <Clock className="h-6 w-6 mb-1" />
                      Verify Morning Arrival
                      <span className="text-[10px] font-normal opacity-70">Shift Standard: 08:00 AM</span>
                    </>
                  )}
                </Button>
                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-600 leading-relaxed font-medium">
                    Clock-ins after 08:00 AM are automatically flagged as late arrivals for institutional reporting.
                  </p>
                </div>
              </div>
            ) : attendance.clockOutTime ? (
              <div className="py-4 flex flex-col items-center text-center space-y-6">
                <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-background shadow-lg">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-bold text-foreground">Shift Secured</h3>
                  <p className="text-muted-foreground text-sm max-w-[240px]">Departure and clinical handover data encrypted.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-2">
                  <div className="bg-muted/50 p-4 rounded-2xl border flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Arrival</span>
                    <span className="text-xl font-bold font-mono">{attendance.clockInTime?.substring(0, 5)}</span>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-2xl border flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Departure</span>
                    <span className="text-xl font-bold font-mono">{attendance.clockOutTime?.substring(0, 5)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-green-500/10 rounded-2xl p-5 flex items-center justify-between border border-green-500/20">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-green-600">Active Session</p>
                      <p className="text-lg font-bold text-foreground">
                        {attendance.clockInTime?.substring(0, 5)} 
                        {attendance.status === 'late' && <span className="text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full ml-2 font-bold uppercase tracking-tighter">Late</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    className="w-full h-24 text-xl rounded-2xl flex flex-col gap-1 bg-accent hover:bg-accent/90 shadow-lg text-accent-foreground font-bold transition-all"
                    onClick={() => setClockOutOpen(true)}
                    disabled={loading}
                  >
                    <ArrowRight className="h-6 w-6 mb-1" />
                    Finalize Shift
                    <span className="text-[10px] font-normal opacity-70">Shift Standard: 05:00 PM</span>
                  </Button>
                  <p className="text-center text-[10px] text-muted-foreground font-medium italic">Protocol active since clock-in.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Departure Protocol</DialogTitle>
            <DialogDescription>Submit clinical handover intelligence and staff well-being score.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Shift Sentiment Score</Label>
              <div className="flex justify-between gap-3">
                {[
                  { v: 3, label: 'Smooth', icon: Smile, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500' },
                  { v: 2, label: 'Hectic', icon: Meh, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500' },
                  { v: 1, label: 'Stressed', icon: Frown, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500' }
                ].map((m) => (
                  <button 
                    key={m.v}
                    onClick={() => setMood(m.v as MoodRating)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      mood === m.v ? `${m.bg} ${m.border}` : "bg-card border-border grayscale hover:grayscale-0 hover:bg-muted"
                    )}
                  >
                    <m.icon className={cn("h-8 w-8", mood === m.v ? m.color : "text-muted-foreground")} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Handover Notes (Mandatory)</Label>
              <Textarea 
                placeholder="Include critical patient updates, pending procedures, or equipment failures..."
                className="min-h-[140px] rounded-xl"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-12 text-lg font-bold rounded-xl shadow-lg"
              disabled={!mood || !notes || loading}
              onClick={handleClockOut}
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Authorize & Sign Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}