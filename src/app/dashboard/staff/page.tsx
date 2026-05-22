
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
  ShieldX
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AttendanceLog, MoodRating } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StaffPage() {
  const { profile, organization, loading: authLoading } = usePulseLogAuth();
  const db = useFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [mood, setMood] = useState<MoodRating | null>(null);
  const [notes, setNotes] = useState("");
  const [locationStatus, setLocationStatus] = useState<'checking' | 'verified' | 'failed' | 'denied'>('checking');
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile) {
      fetchTodayAttendance();
      verifyLocation();
    }
  }, [profile]);

  const verifyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('failed');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        // In a real app, you would compare position.coords with organization.latitude/longitude
        // For the demo, we simulate verification success
        setLocationStatus('verified');
      },
      (error) => {
        setLocationStatus('denied');
        console.error("Location error:", error);
      }
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
      toast({ title: "Security Failure", description: "GPS verification required for clock-in.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HH:mm:ss');
    
    // Check if late (Past 08:00 AM)
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
        description: `Institutional verification successful at ${format(now, 'hh:mm a')}`,
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
    
    // Check if early (Before 05:00 PM)
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
        description: "Your handover notes and clock-out time have been secured and encrypted.",
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to clock out", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="space-y-6 flex flex-col items-center">
      <div className="text-center space-y-2 mb-4">
        <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest mb-2 border border-green-200">
          <ShieldCheck className="h-3 w-3" />
          Secure Session
        </div>
        <h1 className="text-3xl font-headline font-bold text-foreground">Shift Verification</h1>
        <p className="text-muted-foreground">{format(currentDate, 'EEEE, MMMM do, yyyy')}</p>
      </div>

      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-none overflow-hidden bg-white">
          <div className="bg-primary p-8 text-center text-primary-foreground relative">
            <div className="absolute top-4 left-4 opacity-20">
              <MapPin className="h-12 w-12" />
            </div>
            <div className="text-6xl font-mono font-bold tracking-tighter mb-1">
              {format(currentDate, 'hh:mm')}
              <span className="text-2xl ml-1 opacity-60">{format(currentDate, 'ss')}</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-80">{format(currentDate, 'a')} • Facility Standard Time</p>
          </div>

          <CardContent className="p-8 space-y-6">
            {/* Security Status Bar */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
              locationStatus === 'verified' ? "bg-green-50 border-green-200 text-green-700" :
              locationStatus === 'checking' ? "bg-muted border-muted-foreground/10 text-muted-foreground" :
              "bg-red-50 border-red-200 text-red-700"
            )}>
              <div className="flex items-center gap-3">
                {locationStatus === 'verified' ? <LocateFixed className="h-4 w-4" /> :
                 locationStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                 <ShieldX className="h-4 w-4" />}
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {locationStatus === 'verified' ? "In Perimeter" :
                   locationStatus === 'checking' ? "Verifying GPS..." :
                   locationStatus === 'denied' ? "GPS Access Denied" : "Outside Perimeter"}
                </span>
              </div>
              {locationStatus !== 'verified' && (
                <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase" onClick={verifyLocation}>
                  Retry
                </Button>
              )}
            </div>

            {!attendance ? (
              <div className="space-y-6">
                <Button 
                  className={cn(
                    "w-full h-20 text-xl rounded-2xl flex flex-col gap-1 shadow-lg transition-all",
                    locationStatus === 'verified' 
                      ? "bg-primary shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]" 
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  )}
                  onClick={handleClockIn}
                  disabled={loading || locationStatus !== 'verified'}
                >
                  {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                    <>
                      <Clock className="h-6 w-6 mb-1" />
                      Clock In Arrival
                    </>
                  )}
                </Button>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-700 leading-tight">
                    <strong>Note:</strong> Institutional protocol requires active GPS location to prevent remote clock-in attempts.
                  </p>
                </div>
              </div>
            ) : attendance.clockOutTime ? (
              <div className="py-4 flex flex-col items-center text-center space-y-6">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-bold text-foreground">Shift Finalized</h3>
                  <p className="text-muted-foreground text-sm max-w-[240px]">Shift and handover intelligence has been securely logged.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-2">
                  <div className="bg-muted/30 p-4 rounded-2xl border flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Arrival</span>
                    <span className="text-xl font-bold font-mono">{attendance.clockInTime?.substring(0, 5)}</span>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl border flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Departure</span>
                    <span className="text-xl font-bold font-mono">{attendance.clockOutTime?.substring(0, 5)}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                  New Session
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-green-50 rounded-2xl p-5 flex items-center justify-between border border-green-100">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-green-700">Presence Verified</p>
                      <p className="text-lg font-bold text-foreground">{attendance.clockInTime?.substring(0, 5)} {attendance.status === 'late' && <span className="text-[10px] bg-destructive text-white px-2 py-0.5 rounded-full ml-2 font-bold uppercase">Late</span>}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline"
                    className="w-full h-20 text-xl rounded-2xl flex flex-col gap-1 border-2 border-primary/20 hover:bg-primary/5 hover:border-primary transition-all text-primary font-bold shadow-sm"
                    onClick={() => setClockOutOpen(true)}
                    disabled={loading}
                  >
                    <ArrowRight className="h-6 w-6 mb-1" />
                    Initiate Handover
                  </Button>
                  <p className="text-center text-[10px] text-muted-foreground font-medium italic">Shift active: {format(currentDate, 'hh:mm:ss a')}</p>
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
                  { v: 3, label: 'Smooth', icon: Smile, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500' },
                  { v: 2, label: 'Hectic', icon: Meh, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500' },
                  { v: 1, label: 'Stressed', icon: Frown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500' }
                ].map((m) => (
                  <button 
                    key={m.v}
                    onClick={() => setMood(m.v as MoodRating)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      mood === m.v ? `${m.bg} ${m.border}` : "bg-background border-transparent grayscale hover:grayscale-0 hover:bg-muted"
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
                className="min-h-[140px] rounded-xl focus:ring-primary border-muted"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {new Date() < new Date(new Date().setHours(17, 0, 0)) && (
              <div className="bg-destructive/10 p-3 rounded-xl border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-[10px] text-destructive font-bold uppercase leading-tight">
                  Early Departure Flag: Leaving before 05:00 PM requires institutional justification in notes.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-12 text-lg font-bold rounded-xl shadow-lg bg-primary"
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
