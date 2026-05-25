
"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || loading) return;
    setLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create the Super Admin profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: email,
        name: fullName,
        role: 'super-admin',
        department: 'Platform Governance',
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Platform Governance Established",
        description: "Welcome, Super Admin. Redirecting to SaaS controller...",
      });

      router.push("/dashboard/super-admin");
    } catch (error: any) {
      toast({
        title: "Provisioning Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem]">
        <CardHeader className="space-y-2 text-center pt-10">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-3xl">
              <ShieldCheck className="h-12 w-12 text-primary" strokeWidth={2.5} />
            </div>
          </div>
          <CardTitle className="text-3xl font-headline font-black tracking-tight">Governance Provisioning</CardTitle>
          <CardDescription className="text-xs uppercase font-bold tracking-[0.2em] text-primary">PulseLog SaaS Infrastructure</CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Admin Full Name</Label>
              <Input 
                placeholder="Super Admin Name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required 
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Governance Email</Label>
              <Input 
                type="email" 
                placeholder="saas-admin@pulselog.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Secure Password</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="h-12 rounded-xl pr-12"
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
            <Button className="w-full h-14 text-lg font-black rounded-2xl shadow-xl mt-4" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Initialize Governance"}
            </Button>
          </form>
          <p className="mt-8 text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">
            This route is for platform administrators only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
