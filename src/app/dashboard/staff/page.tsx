
"use client";

import { useState, useEffect } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc, query, where, collection, getDocs, limit, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ArrowLeft, 
  Smile, 
  Meh, 
  Frown, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AttendanceLog, MoodRating } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StaffPage() {
  const { profile, loading: authLoading } = usePulseLogAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [mood, setMood] = useState<MoodRating | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile) {
      fetchTodayAttendance();
    }
  }, [profile]);

  const fetchTodayAttendance = async () => {
    if (!profile) return;
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
    if (!profile) return;
    setLoading(true);
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HH:mm:ss');
    
    // Check if late (Past 08:00 AM)
    const lateThreshold = new Date();
    lateThreshold.setHours(8, 0, 0);
    const status = now > lateThreshold ? 'late' : 'on-time';

    const newLogRef = doc(collection(db, "attendance_logs"));
    const newLog: AttendanceLog = {
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
    };

    try {
      await setDoc(newLogRef, newLog);
      setAttendance(newLog);
      toast({
        title: status === 'late' ? "Late Arrival Recorded" : "Clocked In",
        description: `Successfully clocked in at ${format(now, 'hh:mm a')}`,
        variant: status === 'late' ? "destructive" : "default",
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to clock in", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!attendance || !profile) return;
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
        ...attendance,
        clockOutTime: timeStr,
        status: status,
        moodRating: mood,
        handoverNotes: notes,
      }, { merge: true });
      
      setAttendance(prev => prev ? { ...prev, clockOutTime: timeStr, moodRating: mood, handoverNotes: notes, status } : null);
      setClockOutOpen(false);
      toast({
        title: "Shift Completed",
        description: "Your handover notes and clock-out time have been secured.",
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
        <h1 className="text-3xl font-headline font-bold text-foreground">Daily Shift Management</h1>
        <p className="text-muted-foreground">{format(currentDate, 'EEEE, MMMM do')}</p>
      </div>

      <div className="w-full max-w-md">
        <Card className="shadow-xl border-t-4 border-t-primary overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="text-5xl font-mono font-bold tracking-tighter text-primary mb-2">
              {format(currentDate, 'hh:mm:ss')}
              <span className="text-lg ml-1 text-muted-foreground font-headline font-medium uppercase tracking-widest">{format(currentDate, 'a')}</span>
            </div>
            <CardDescription className="font-medium text-foreground">Institutional Protocol: 08:00 AM — 05:00 PM</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {!attendance ? (
              <div className="space-y-4">
                <Button 
                  className="w-full h-24 text-xl rounded-2xl flex flex-col gap-1 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  onClick={handleClockIn}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                    <>
                      <Clock className="h-8 w-8 mb-1" />
                      Clock In Arrival
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground italic">Arriving past 08:00 AM will flag your status as 'Late'.</p>
              </div>
            ) : attendance.clockOutTime ? (
              <div className="bg-primary/5 rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-headline font-bold text-foreground">Shift Concluded</h3>
                  <p className="text-muted-foreground text-sm">You have successfully completed your tasks for today.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-2">
                  <div className="bg-white p-3 rounded-xl border">
                    <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-widest">In</span>
                    <span className="text-lg font-bold">{attendance.clockInTime?.substring(0, 5)}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border">
                    <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Out</span>
                    <span className="text-lg font-bold">{attendance.clockOutTime?.substring(0, 5)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-primary/5 rounded-2xl p-4 flex items-center justify-between border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Clocked In At</p>
                      <p className="font-bold text-foreground">{attendance.clockInTime?.substring(0, 5)} {attendance.status === 'late' && <span className="text-[10px] bg-destructive/10 text-destructive px-1 rounded ml-1 font-bold">LATE</span>}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="text-primary h-6 w-6" />
                </div>

                <Button 
                  variant="outline"
                  className="w-full h-24 text-xl rounded-2xl flex flex-col gap-1 border-2 border-primary/20 hover:bg-primary/5 hover:border-primary transition-all text-primary font-bold shadow-sm"
                  onClick={() => setClockOutOpen(true)}
                  disabled={loading}
                >
                  <ArrowRight className="h-8 w-8 mb-1" />
                  Clock Out Departure
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Departure & Handover</DialogTitle>
            <DialogDescription>Please provide your shift reflection and handover notes before leaving.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Current Shift Mood</Label>
              <div className="flex justify-between gap-4">
                <button 
                  onClick={() => setMood(3)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    mood === 3 ? "bg-green-50 border-green-500" : "bg-background border-transparent grayscale hover:grayscale-0 hover:bg-muted"
                  )}
                >
                  <Smile className={cn("h-8 w-8", mood === 3 ? "text-green-600" : "text-muted-foreground")} />
                  <span className="text-[10px] font-bold uppercase">Smooth</span>
                </button>
                <button 
                  onClick={() => setMood(2)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    mood === 2 ? "bg-amber-50 border-amber-500" : "bg-background border-transparent grayscale hover:grayscale-0 hover:bg-muted"
                  )}
                >
                  <Meh className={cn("h-8 w-8", mood === 2 ? "text-amber-600" : "text-muted-foreground")} />
                  <span className="text-[10px] font-bold uppercase">Hectic</span>
                </button>
                <button 
                  onClick={() => setMood(1)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    mood === 1 ? "bg-red-50 border-red-500" : "bg-background border-transparent grayscale hover:grayscale-0 hover:bg-muted"
                  )}
                >
                  <Frown className={cn("h-8 w-8", mood === 1 ? "text-red-600" : "text-muted-foreground")} />
                  <span className="text-[10px] font-bold uppercase">Stressed</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Shift Handover Notes</Label>
              <Textarea 
                placeholder="Detail critical patient updates, pending tasks, or operational issues..."
                className="min-h-[120px] rounded-xl"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {new Date() < new Date(new Date().setHours(17, 0, 0)) && (
              <div className="bg-destructive/10 p-3 rounded-xl border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive font-medium leading-relaxed">
                  Notice: Your departure is before the institutional 05:00 PM standard. This will be flagged as an 'Early Departure'.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              className="w-full h-12 text-lg font-bold rounded-xl shadow-lg"
              disabled={!mood || !notes || loading}
              onClick={handleClockOut}
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Secure Handover & Clock Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
