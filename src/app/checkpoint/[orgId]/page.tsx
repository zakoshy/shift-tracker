
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore, useDoc } from "@/firebase";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Activity, 
  Loader2, 
  MapPin, 
  ShieldCheck, 
  UserCircle, 
  Car, 
  Phone, 
  MessageSquare,
  AlertCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { Organization } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function CheckpointPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { profile, organization, loading: authLoading } = usePulseLogAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorReason, setVisitorReason] = useState("");
  const [visitorPlate, setVisitorPlate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch organization if not already available from auth hook
  const orgRef = doc(db, "organizations", orgId);
  const { data: checkpointOrg, loading: orgLoading } = useDoc<Organization>(orgRef);

  const displayOrg = organization || checkpointOrg;

  const handleVisitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayOrg || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newLogRef = doc(collection(db, "visitor_logs"));
      await setDoc(newLogRef, {
        id: newLogRef.id,
        organizationId: displayOrg.id,
        name: visitorName,
        phone: visitorPhone,
        reason: visitorReason,
        vehiclePlate: visitorPlate,
        entryTime: new Date().toISOString()
      });
      toast({ title: "Access Granted", description: "Visitor protocol documented. Welcome." });
      // Clear form
      setVisitorName(""); setVisitorPhone(""); setVisitorReason(""); setVisitorPlate("");
    } catch (err) {
      toast({ title: "Sync Error", description: "Failed to log visitor access.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || orgLoading) {
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
        <Link href="/">
          <Button variant="ghost" className="mt-6">Return Home</Button>
        </Link>
      </div>
    );
  }

  const isStaffMember = profile?.organizationId === displayOrg.id;

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
              <CardDescription>Welcome back, {profile?.name}. GPS anti-fraud protocol active.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  Proceed to your shift lifecycle management portal. Arrival and departure must be verified within the facility perimeter.
                </p>
              </div>
              <Button onClick={() => router.push('/dashboard/staff')} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
                Enter Staff Portal
                <ArrowRight className="ml-2 h-5 w-5" />
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
              <CardDescription>Documentation required for facility entry.</CardDescription>
            </CardHeader>
            <form onSubmit={handleVisitorSubmit}>
              <CardContent className="p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Full Name</Label>
                    <Input 
                      placeholder="Enter name" 
                      value={visitorName} 
                      onChange={e => setVisitorName(e.target.value)} 
                      required 
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="000-000-0000" 
                        value={visitorPhone} 
                        onChange={e => setVisitorPhone(e.target.value)} 
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
                      placeholder="e.g., Delivery, Meeting, Consultation" 
                      value={visitorReason} 
                      onChange={e => setVisitorReason(e.target.value)} 
                      required 
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Vehicle Plate (Optional)</Label>
                  <div className="relative">
                    <Car className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="ABC-1234" 
                      value={visitorPlate} 
                      onChange={e => setVisitorPlate(e.target.value)} 
                      className="h-12 rounded-xl pl-10"
                    />
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
                <div className="text-center">
                  <Link href="/login" className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Institutional Staff Login
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        )}

        <div className="text-center opacity-40">
          <p className="text-[10px] font-bold uppercase tracking-widest">PulseLog © {new Date().getFullYear()} Security Protocol</p>
        </div>
      </div>
    </div>
  );
}
