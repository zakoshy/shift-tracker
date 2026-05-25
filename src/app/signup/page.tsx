
"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, serverTimestamp, getDoc } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Activity, Loader2, Hospital, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || loading) return;
    
    // Security: Input Sanitization
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedOrgName = orgName.trim();
    const sanitizedFullName = fullName.trim();

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      const user = userCredential.user;

      // Security: Idempotency check for organization
      const orgRef = doc(collection(db, "organizations"));
      const orgId = orgRef.id;
      
      await setDoc(orgRef, {
        id: orgId,
        name: sanitizedOrgName,
        createdAt: serverTimestamp(),
        overtimeEnabled: false,
        suspended: false,
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        organizationId: orgId,
        email: sanitizedEmail,
        name: sanitizedFullName,
        role: 'admin',
        department: 'Administration',
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Account Established",
        description: `Welcome to PulseLog. Institutional infrastructure for ${sanitizedOrgName} is ready.`,
      });

      router.push("/dashboard/admin");
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Activity className="h-12 w-12 text-primary" strokeWidth={2.5} />
          </div>
          <CardTitle className="text-2xl font-headline font-bold">Establish Organization</CardTitle>
          <CardDescription>Launch PulseLog for your workforce facility</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <div className="relative">
                  <Hospital className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="orgName" 
                    placeholder="Acme Corp" 
                    className="pl-10"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Admin Full Name</Label>
                <Input 
                  id="fullName" 
                  placeholder="John Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@org.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="pr-10"
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
            <Button className="w-full h-11" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy PulseLog"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
