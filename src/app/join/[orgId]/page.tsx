
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Activity, Loader2, UserPlus, ShieldAlert, Eye, EyeOff, Building2 } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(true);
  
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
        console.error("Error fetching organization:", err);
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
        department: department,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Registration Successful",
        description: `Welcome to PulseLog! You are now part of ${organization.name}.`,
      });

      router.push("/dashboard/staff");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-bold text-primary animate-pulse uppercase tracking-widest">Verifying Institutional Invite...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center p-8 shadow-2xl border-destructive/20">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-6 opacity-80" />
          <CardTitle className="text-2xl font-headline font-bold mb-4">Broken Protocol Link</CardTitle>
          <CardDescription className="text-base mb-8">
            This invitation link is invalid or has expired. Please ensure you scanned the latest QR code from your administrator.
          </CardDescription>
          <div className="flex flex-col gap-3">
            <Link href="/">
              <Button variant="default" className="w-full py-6 font-bold text-lg">Return to PulseLog Home</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full">Existing Staff Login</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-lg shadow-[0_0_50px_rgba(41,85,178,0.1)] border-primary/5">
        <CardHeader className="space-y-2 text-center pb-8 border-b bg-muted/30 rounded-t-xl">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-primary/10">
              <Activity className="h-10 w-10 text-primary" strokeWidth={2.5} />
            </div>
          </div>
          <CardTitle className="text-3xl font-headline font-bold tracking-tight text-foreground">Staff Onboarding</CardTitle>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Building2 className="h-4 w-4" />
            <span className="font-bold text-sm uppercase tracking-wide">{organization.name}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</Label>
                <Input 
                  id="fullName" 
                  placeholder="Jane Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clinical Area</Label>
                <Input 
                  id="department" 
                  placeholder="Nursing, ER, etc." 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required 
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Work Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="jane@organization.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Security Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="pr-10 rounded-xl"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 rounded-xl mt-4" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><UserPlus className="mr-2 h-5 w-5" /> Join Institutional Workforce</>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center pb-8">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] px-4">
            By joining, you authorize institutional presence verification and clinical handover synthesis.
          </p>
          <div className="h-px w-full bg-border" />
          <Link href="/login" className="text-sm text-primary font-bold hover:underline">
            Already have a profile? Log in here
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
