
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
import { Activity, Loader2, UserPlus, CheckCircle2, ShieldAlert } from "lucide-react";
import { Organization } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function JoinOrganizationPage() {
  const { orgId } = useParams();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (!orgId || !db) return;
      try {
        const orgDoc = await getDoc(doc(db, "organizations", orgId as string));
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
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Create User Profile
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
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center p-8">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-xl mb-2">Invalid Invite Link</CardTitle>
          <CardDescription>This organization does not exist or the link is broken. Please contact your administrator.</CardDescription>
          <Link href="/" className="mt-6 block">
            <Button variant="outline">Return Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-lg shadow-xl border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Activity className="h-12 w-12 text-primary" strokeWidth={2.5} />
          </div>
          <CardTitle className="text-2xl font-headline font-bold">Staff Onboarding</CardTitle>
          <CardDescription>Register your profile for <strong>{organization.name}</strong></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  placeholder="Jane Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input 
                  id="department" 
                  placeholder="Nursing, ER, etc." 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="jane@organization.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button className="w-full h-11 shadow-lg shadow-primary/20" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><UserPlus className="mr-2 h-4 w-4" /> Join Organization</>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-xs text-muted-foreground">
            By joining, you agree to follow institutional shift protocols.
          </p>
          <Link href="/login" className="text-sm text-primary font-semibold hover:underline">
            Already have an account? Log in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
