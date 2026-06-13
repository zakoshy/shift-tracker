
"use client";

import { useState, useMemo, memo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore, useDoc } from "@/firebase";
import { doc, setDoc, collection, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  Loader2, 
  ShieldCheck, 
  UserCircle, 
  Car, 
  Phone, 
  MessageSquare,
  AlertCircle,
  ArrowRight,
  LogOut,
  CheckCircle2,
  Bike
} from "lucide-react";
import { Organization, VehicleType, VisitorLog } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

/**
 * Memoized Visitor Form component to prevent full page reloads 
 * and input stuttering during state updates.
 */
const VisitorForm = memo(({ organizationId, onSubmit, isSubmitting }: { 
  organizationId: string, 
  onSubmit: (data: any) => Promise<void>,
  isSubmitting: boolean 
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("None");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, phone, reason, vehiclePlate: plate, vehicleType });
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="p-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Full Name</Label>
            <Input 
              placeholder="Enter name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Phone (Kenya: 07XX...)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="07XX XXX XXX" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                required 
                className="h-12 rounded-xl pl-10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Reason for Visit</Label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="e.g., Delivery, Meeting, Maintenance" 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              required 
              className="h-12 rounded-xl pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Vehicle Type</Label>
            <Select onValueChange={(v) => setVehicleType(v as VehicleType)} defaultValue="None">
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">No Vehicle (Pedestrian)</SelectItem>
                <SelectItem value="Car">Car</SelectItem>
                <SelectItem value="Motorcycle">Motorcycle / Boda Boda</SelectItem>
                <SelectItem value="Tuktuk">Tuktuk</SelectItem>
                <SelectItem value="Truck">Truck / Van</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Vehicle Plate (Optional)</Label>
            <div className="relative">
              <Car className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="KXX 000X" 
                value={plate} 
                onChange={e => setPlate(e.target.value)} 
                className="h-12 rounded-xl pl-10"
              />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-8 pt-0 flex flex-col gap-4">
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl bg-[#002B5B] hover:bg-[#002B5B]/90"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize Entry"}
        </Button>
      </CardFooter>
    </form>
  );
});

VisitorForm.displayName = "VisitorForm";

export default function CheckpointPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { profile, organization, loading: authLoading } = usePulseLogAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeVisitorId, setActiveVisitorId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Session memory: Remember if this device already has an active entry
    const savedId = localStorage.getItem(`active_visitor_${orgId}`);
    if (savedId) setActiveVisitorId(savedId);
  }, [orgId]);

  const orgRef = useMemo(() => orgId ? doc(db, "organizations", orgId) : null, [db, orgId]);
  const { data: checkpointOrg, loading: orgLoading } = useDoc<Organization>(orgRef);

  const displayOrg = organization || checkpointOrg;

  const handleVisitorSubmit = async (data: any) => {
    if (!displayOrg || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newLogRef = doc(collection(db, "visitor_logs"));
      const newLogId = newLogRef.id;
      
      await setDoc(newLogRef, {
        id: newLogId,
        organizationId: displayOrg.id,
        ...data,
        entryTime: new Date().toISOString()
      });
      
      localStorage.setItem(`active_visitor_${orgId}`, newLogId);
      setActiveVisitorId(newLogId);
      setSubmitted(true);
      toast({ title: "Access Granted", description: "Identity verified. Proceed." });
    } catch (err) {
      toast({ title: "Sync Error", description: "Failed to log access.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVisitorCheckout = async () => {
    if (!activeVisitorId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "visitor_logs", activeVisitorId), {
        exitTime: new Date().toISOString()
      });
      localStorage.removeItem(`active_visitor_${orgId}`);
      setActiveVisitorId(null);
      setSubmitted(true);
      toast({ title: "Departure Verified", description: "Safe travels." });
    } catch (err) {
      toast({ title: "Checkout Error", description: "Failed to log departure.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!displayOrg) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-black">Checkpoint Error</h1>
        <p className="text-muted-foreground mt-2">The institutional perimeter could not be resolved.</p>
      </div>
    );
  }

  const isStaffMember = !authLoading && profile?.organizationId === displayOrg.id;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-3xl">
              <Activity className="h-10 w-10 text-primary" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight">{displayOrg.name}</h1>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Secure Checkpoint Hub</p>
        </div>

        {isStaffMember ? (
          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in zoom-in-95">
            <CardHeader className="p-8 text-center bg-primary/5 border-b">
              <CardTitle className="text-2xl font-bold">Personnel Recognized</CardTitle>
              <CardDescription>Welcome back, {profile?.name}. GPS anti-fraud active.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-6 text-center">
              <Button onClick={() => router.push('/dashboard/staff')} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
                Enter Staff Portal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        ) : submitted ? (
          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <CardContent className="p-12 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Protocol Complete</h2>
                <p className="text-muted-foreground">Your presence has been documented. Thank you for complying with facility security.</p>
              </div>
              <Button onClick={() => setSubmitted(false)} variant="outline" className="rounded-xl h-12 px-8 font-bold">
                Return to Entry
              </Button>
            </CardContent>
          </Card>
        ) : activeVisitorId ? (
          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
            <CardHeader className="p-8 text-center bg-amber-50 border-b">
              <CardTitle className="text-2xl font-bold text-amber-900">Visitor Detected On-Site</CardTitle>
              <CardDescription className="text-amber-800/60">You have an active entry record. Verify departure to complete protocol.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 text-center">
              <Button 
                onClick={handleVisitorCheckout} 
                disabled={isSubmitting}
                className="w-full h-16 rounded-2xl text-xl font-black bg-amber-600 hover:bg-amber-700 shadow-xl"
              >
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "Verify Departure"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
            <CardHeader className="p-8 text-center bg-muted/50 border-b">
              <div className="flex justify-center mb-4">
                <UserCircle className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">Visitor Access Protocol</CardTitle>
              <CardDescription>Identity and reason for visit required for entry.</CardDescription>
            </CardHeader>
            <VisitorForm 
              organizationId={displayOrg.id} 
              onSubmit={handleVisitorSubmit} 
              isSubmitting={isSubmitting} 
            />
            <div className="p-8 pt-0 text-center">
              <Link href="/login" className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Staff Login
              </Link>
            </div>
          </Card>
        )}

        <div className="text-center opacity-40">
          <p className="text-[10px] font-bold uppercase tracking-widest">PulseLog © {new Date().getFullYear()} Cyber-Resilient Protocol</p>
        </div>
      </div>
    </div>
  );
}
