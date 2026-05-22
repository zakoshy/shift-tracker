
"use client";

import { useState, useMemo, useEffect } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore, useAuth, useCollection } from "@/firebase";
import { collection, query, where, doc, deleteDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  QrCode, 
  Trash2, 
  Copy,
  CheckCircle2,
  Loader2,
  Edit2,
  UserCheck,
  AlertTriangle,
  Clock
} from "lucide-react";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

export default function StaffRosterPage() {
  const { profile, organization } = usePulseLogAuth();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [copied, setCopied] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualDept, setManualDept] = useState("");
  const [manualShiftStart, setManualShiftStart] = useState("08:00");
  const [manualShiftEnd, setManualShiftEnd] = useState("17:00");
  const [isCreating, setIsCreating] = useState(false);

  const staffQuery = useMemo(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "users"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile?.organizationId]);

  const { data: staff, loading } = useCollection<UserProfile>(staffQuery);

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined' || !profile?.organizationId || profile.organizationId === "undefined") return "";
    return `${window.location.origin}/join/${profile.organizationId}`;
  }, [profile?.organizationId]);

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: "Protocol Copied", description: "Onboarding link synchronized." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteStaff = async (userId: string, name: string) => {
    if (confirm(`Remove ${name} from institutional access?`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
        toast({ title: "Personnel Revoked", description: `${name} has been removed.` });
      } catch (err) {
        toast({ title: "Error", description: "Authorization failure during removal.", variant: "destructive" });
      }
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "users", editingStaff.uid), {
        name: editingStaff.name,
        department: editingStaff.department,
        shiftStart: editingStaff.shiftStart || "08:00",
        shiftEnd: editingStaff.shiftEnd || "17:00",
      });
      toast({ title: "Profile Secured", description: "Shift and personnel data updated." });
      setEditingStaff(null);
    } catch (err) {
      toast({ title: "Update Failed", description: "Failed to synchronize profile changes.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organizationId) return;
    setIsCreating(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, manualEmail, manualPassword);
      const newUser = userCredential.user;
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        organizationId: profile.organizationId,
        email: manualEmail,
        name: manualName,
        role: 'staff',
        department: manualDept,
        shiftStart: manualShiftStart,
        shiftEnd: manualShiftEnd,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Personnel Added", description: `${manualName} registered successfully.` });
      setManualName(""); setManualEmail(""); setManualPassword(""); setManualDept("");
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-foreground tracking-tight">Institutional Roster</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage personnel authorization and shift configurations.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg bg-primary hover:bg-primary/90 px-6">
              <UserPlus className="mr-2 h-4 w-4" />
              Onboard Personnel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Onboarding Protocol</DialogTitle>
              <DialogDescription>Authorize new staff via automated link or manual registration.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="qr" className="rounded-lg">Secure Invite</TabsTrigger>
                <TabsTrigger value="manual" className="rounded-lg">Manual Entry</TabsTrigger>
              </TabsList>
              <TabsContent value="qr" className="space-y-6">
                <div className="flex flex-col items-center py-6 space-y-6">
                  <div className="bg-white p-6 rounded-[2rem] border-2 border-primary/10 shadow-xl flex items-center justify-center min-h-[240px]">
                    {inviteUrl ? (
                      <QRCodeSVG value={inviteUrl} size={200} level="H" className="text-primary" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Generating Token...</span>
                      </div>
                    )}
                  </div>
                  <div className="w-full space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center">Registration Endpoint</p>
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border font-mono text-xs break-all">
                      <span className="flex-1 opacity-60">{inviteUrl || "Loading organization context..."}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopyLink} disabled={!inviteUrl}>
                        {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="manual" className="space-y-4 pt-4">
                <form onSubmit={handleManualCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="mName" className="text-[10px] uppercase font-bold tracking-widest">Full Name</Label>
                      <Input id="mName" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Personnel Name" required className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mDept" className="text-[10px] uppercase font-bold tracking-widest">Department</Label>
                      <Input id="mDept" value={manualDept} onChange={e => setManualDept(e.target.value)} placeholder="e.g., ICU, ER" required className="rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="mShiftS" className="text-[10px] uppercase font-bold tracking-widest">Shift Start</Label>
                      <Input id="mShiftS" type="time" value={manualShiftStart} onChange={e => setManualShiftStart(e.target.value)} required className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mShiftE" className="text-[10px] uppercase font-bold tracking-widest">Shift End</Label>
                      <Input id="mShiftE" type="time" value={manualShiftEnd} onChange={e => setManualShiftEnd(e.target.value)} required className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mEmail" className="text-[10px] uppercase font-bold tracking-widest">Work Email</Label>
                    <Input id="mEmail" type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} placeholder="email@facility.com" required className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mPass" className="text-[10px] uppercase font-bold tracking-widest">Temp Password</Label>
                    <Input id="mPass" type="password" value={manualPassword} onChange={e => setManualPassword(e.target.value)} placeholder="••••••••" required className="rounded-xl" />
                  </div>
                  <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 flex gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-700 font-bold leading-tight uppercase tracking-tight">Manual creation bypasses invitation protocols and may require secondary verification.</p>
                  </div>
                  <Button className="w-full h-12 rounded-xl" type="submit" disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize & Register Profile"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-none bg-card">
          <CardHeader className="border-b pb-6">
            <CardTitle className="text-lg flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              Verified Workforce
            </CardTitle>
            <CardDescription className="text-xs uppercase font-bold tracking-widest opacity-60">Database of authorized institutional staff</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>
            ) : !staff || staff.length === 0 ? (
              <div className="text-center py-20 opacity-20"><Users className="h-16 w-16 mx-auto" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Shift Profile</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest">Department</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.uid} className="hover:bg-muted/10">
                      <TableCell className="pl-6 font-bold text-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/5 text-primary border flex items-center justify-center text-[10px] font-black">
                            {member.name.charAt(0)}
                          </div>
                          {member.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg text-[9px] font-mono border-muted">
                          <Clock className="h-3 w-3 mr-1 opacity-40" />
                          {member.shiftStart} - {member.shiftEnd}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-lg text-[9px] font-bold uppercase bg-muted/50 border-none">
                          {member.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingStaff(member)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {member.uid !== profile?.uid && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDeleteStaff(member.uid, member.name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-[#002B5B] text-white border-none shadow-xl rounded-[2rem]">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] opacity-60">System Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-xs opacity-60 font-bold uppercase">Workforce Size</span>
                <span className="text-4xl font-black">{staff?.length || 0}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between items-end">
                <span className="text-xs opacity-60 font-bold uppercase">Clinical Units</span>
                <span className="text-4xl font-black">{new Set(staff?.map(s => s.department)).size}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profile Update Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Configure Profile</DialogTitle>
            <DialogDescription>Modify shift timings and departmental assignments.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStaff} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personnel Name</Label>
              <Input value={editingStaff?.name || ""} onChange={e => setEditingStaff(p => p ? {...p, name: e.target.value} : null)} required className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clinical Area</Label>
              <Input value={editingStaff?.department || ""} onChange={e => setEditingStaff(p => p ? {...p, department: e.target.value} : null)} required className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shift Start</Label>
                <Input type="time" value={editingStaff?.shiftStart || "08:00"} onChange={e => setEditingStaff(p => p ? {...p, shiftStart: e.target.value} : null)} required className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shift End</Label>
                <Input type="time" value={editingStaff?.shiftEnd || "17:00"} onChange={e => setEditingStaff(p => p ? {...p, shiftEnd: e.target.value} : null)} required className="rounded-xl" />
              </div>
            </div>
            <DialogFooter className="pt-6">
              <Button type="submit" disabled={isUpdating} className="w-full h-12 rounded-xl">
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Commit Institutional Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
