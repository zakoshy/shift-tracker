
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Activity, Loader2, UserPlus, ShieldAlert, Eye, EyeOff, Building2, LogIn, AlertCircle, RefreshCcw, LogOut } from "lucide-react";
import { Organization } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function JoinOrganizationPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(true);
  
  const { user: currentUser, loading: userLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchOrg() {
      if (!orgId || orgId === "undefined" || !db) {
        setOrgLoading(false); 
        return;
      }
      try {
        const orgDoc = await getDoc(doc(db, "organizations", orgId));
        if (orgDoc.exists()) {
          setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
        }
      } catch (err) {
        console.error("Failed to resolve organization:", err);
      } finally {
        setOrgLoading(false);
      }
    }
    fetchOrg();
  }, [orgId, db]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !organization) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        organizationId: organization.id,
        email,
        name: fullName,
        role: 'staff',
        department,
        shiftStart,
        shiftEnd,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Registration Successful", description: `Welcome to ${organization.name}.` });
      router.push("/dashboard/staff");
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ 
          title: "Account Already Exists", 
          description: "This email is already registered. Please login to continue.",
          variant: "destructive"
        });
      } else {
        toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: "Account Released", description: "You can now select a different account for registration." });
  };

  if (orgLoading || userLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-[10px] font-black text-primary animate-pulse uppercase tracking-[0.3em]">Validating Operational Perimeter...</p>
      </div>
    </div>
  );

  if (!organization || orgId === "undefined") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center p-12 shadow-2xl rounded-[2.5rem] border-none">
          <div className="bg-destructive/10 h-20 w-20 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-3xl font-headline font-black mb-4">Institutional Sync Required</CardTitle>
          <CardDescription className="text-sm font-medium mb-10 leading-relaxed">
            The enrollment token is currently synchronizing with the cloud. 
            <br/><br/>
            <span className="text-destructive font-bold uppercase tracking-widest text-[10px]">Action:</span> Please wait 10 seconds and refresh, or ask your admin to re-share the link.
          </CardDescription>
          <div className="space-y-4">
            <Button onClick={() => window.location.reload()} className="w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              Retry Cloud Sync
            </Button>
            <Link href="/" className="block">
              <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground">Return Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-16">
      <Card className="w-full max-w-xl shadow-[0_30px_80px_rgba(41,85,178,0.15)] border-none rounded-[3rem] overflow-hidden">
        <CardHeader className="text-center p-12 bg-muted/30">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-3xl shadow-sm ring-1 ring-primary/5">
              <Activity className="h-12 w-12 text-primary" strokeWidth={3} />
            </div>
          </div>
          <CardTitle className="text-4xl font-headline font-black tracking-tight">Staff Enrollment</CardTitle>
          <div className="flex items-center justify-center gap-2 text-primary mt-2">
            <Building2 className="h-4 w-4" />
            <span className="font-black text-xs uppercase tracking-widest">{organization.name}</span>
          </div>
        </CardHeader>
        <CardContent className="p-12">
          {currentUser ? (
            <div className="space-y-8">
              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 text-center">
                <p className="text-sm font-bold text-foreground mb-1">Authenticated As:</p>
                <p className="text-lg font-black text-primary mb-4">{currentUser.email}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">You are already logged in. To enroll in <span className="font-bold">{organization.name}</span> using this account, simply complete the profile details below.</p>
              </div>

              {/* If user is logged in, we only need profile details */}
              <form onSubmit={handleJoin} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                    <Input placeholder="Your Name" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-14 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department</Label>
                    <Input placeholder="e.g., Ops" value={department} onChange={e => setDepartment(e.target.value)} required className="h-14 rounded-2xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                  <div className="space-y-2 text-center">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Shift Start</Label>
                    <Input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} required className="h-14 rounded-2xl text-center font-mono font-bold" />
                  </div>
                  <div className="space-y-2 text-center">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Shift End</Label>
                    <Input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} required className="h-14 rounded-2xl text-center font-mono font-bold" />
                  </div>
                </div>
                <Button className="w-full h-16 text-xl font-black rounded-3xl shadow-2xl mt-4" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <><UserPlus className="mr-2 h-6 w-6" /> Finalize Enrollment</>}
                </Button>
                <div className="pt-4 border-t text-center">
                  <Button variant="ghost" type="button" onClick={handleSignOut} className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center justify-center gap-2 mx-auto">
                    <LogOut className="h-4 w-4" />
                    Switch to a different email account
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <Input placeholder="Your Name" value={fullName} onChange={e => setFullName(e.target.value)} required className="h-14 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department</Label>
                  <Input placeholder="e.g., Ops" value={department} onChange={e => setDepartment(e.target.value)} required className="h-14 rounded-2xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                <div className="space-y-2 text-center">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Shift Start</Label>
                  <Input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} required className="h-14 rounded-2xl text-center font-mono font-bold" />
                </div>
                <div className="space-y-2 text-center">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Shift End</Label>
                  <Input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} required className="h-14 rounded-2xl text-center font-mono font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Work Email</Label>
                <Input type="email" placeholder="name@org.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-14 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required className="h-14 rounded-2xl pr-12" />
                  <Button type="button" variant="ghost" className="absolute right-0 top-0 h-full px-4" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Button>
                </div>
              </div>
              <Button className="w-full h-16 text-xl font-black rounded-3xl shadow-2xl mt-4" type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <><UserPlus className="mr-2 h-6 w-6" /> Join Workforce</>}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-6 text-center p-12 pt-0">
          <Link href="/login" className="flex items-center gap-2 text-primary font-bold hover:underline">
            <LogIn className="h-4 w-4" />
            Existing Account Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
