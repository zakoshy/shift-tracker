
"use client";

import { useState, useMemo } from "react";
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
  Building2,
  Copy,
  CheckCircle2,
  Loader2,
  Edit2,
  UserCheck,
  AlertTriangle
} from "lucide-react";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

export default function StaffRosterPage() {
  const { profile, organization } = usePulseLogAuth();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  // States
  const [copied, setCopied] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Manual Add Form State
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualDept, setManualDept] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Memoize query to prevent infinite loops
  const staffQuery = useMemo(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "users"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile?.organizationId]);

  const { data: staff, loading } = useCollection<UserProfile>(staffQuery);

  // Stable invite URL calculation
  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined' || !profile?.organizationId) return "";
    return `${window.location.origin}/join/${profile.organizationId}`;
  }, [profile?.organizationId]);

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: "Link Copied", description: "Invite link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteStaff = async (userId: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the roster?`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
        toast({ title: "Staff Removed", description: `${name} has been removed.` });
      } catch (err) {
        toast({ title: "Error", description: "Failed to remove staff member.", variant: "destructive" });
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
      });
      toast({ title: "Profile Updated", description: `${editingStaff.name}'s details have been saved.` });
      setEditingStaff(null);
    } catch (err) {
      toast({ title: "Update Failed", description: "Failed to update staff profile.", variant: "destructive" });
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
        createdAt: serverTimestamp(),
      });

      toast({ title: "Staff Created", description: `${manualName} has been added to the system.` });
      setManualName("");
      setManualEmail("");
      setManualPassword("");
      setManualDept("");
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground">Staff Roster</h1>
          <p className="text-muted-foreground">Manage your institution's workforce and onboarding protocols.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <UserPlus className="mr-2 h-4 w-4" />
              Onboard New Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Onboarding Protocol</DialogTitle>
              <DialogDescription>
                Select a method to bring new personnel into {organization?.name || "the facility"}.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="qr" className="gap-2">
                  <QrCode className="h-4 w-4" />
                  Invite Link / QR
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="qr" className="space-y-6">
                <div className="flex flex-col items-center space-y-6 py-4">
                  <div className="bg-white p-6 rounded-2xl border-2 border-primary/10 shadow-md flex items-center justify-center min-h-[220px]">
                    {inviteUrl ? (
                      <QRCodeSVG 
                        value={inviteUrl} 
                        size={180} 
                        level="H" 
                        includeMargin={false}
                        className="text-primary"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Generating secure link...</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Registration URL</p>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border text-xs font-mono break-all min-h-[40px]">
                      <span className="flex-1">{inviteUrl || "Loading organization ID..."}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8" 
                        onClick={handleCopyLink}
                        disabled={!inviteUrl}
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground italic max-w-sm">
                    Staff scan this QR code to self-register their identity and assign themselves to a clinical department.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="manual" className="space-y-4">
                <form onSubmit={handleManualCreate} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mName">Full Name</Label>
                      <Input id="mName" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="John Smith" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mDept">Department</Label>
                      <Input id="mDept" value={manualDept} onChange={e => setManualDept(e.target.value)} placeholder="ER, Nursing..." required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mEmail">Email Address</Label>
                    <Input id="mEmail" type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} placeholder="john@org.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mPass">Initial Password</Label>
                    <Input id="mPass" type="password" value={manualPassword} onChange={e => setManualPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">
                      Note: Manually creating a user account will securely log you out for institutional verification. Recommended for controlled onboarding.
                    </p>
                  </div>
                  
                  <Button className="w-full" type="submit" disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><UserCheck className="mr-2 h-4 w-4" /> Register & Finalize Profile</>}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-primary/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Registered Personnel
            </CardTitle>
            <CardDescription>Total active staff profiles within {organization?.name || "your organization"}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : !staff || staff.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No staff members registered yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.uid}>
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {member.name.charAt(0)}
                          </div>
                          {member.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted/50 text-[10px] font-bold uppercase">
                          {member.department}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => setEditingStaff(member)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {member.uid !== profile?.uid && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteStaff(member.uid, member.name)}
                            >
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
          <Card className="bg-primary text-primary-foreground border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Facility Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-sm opacity-80">Total Staff</span>
                <span className="text-2xl font-bold">{staff?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-sm opacity-80">Departments</span>
                <span className="text-2xl font-bold">
                  {new Set(staff?.map(s => s.department)).size}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm opacity-80">Administrators</span>
                <span className="text-2xl font-bold">
                  {staff?.filter(s => s.role === 'admin').length || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-accent/[0.02]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-accent">Management Protocol</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex gap-3">
                <Edit2 className="h-5 w-5 text-accent shrink-0" />
                <p className="text-muted-foreground font-medium">Update staff departments manually if they transfer between clinical areas.</p>
              </div>
              <div className="flex gap-3">
                <Building2 className="h-5 w-5 text-accent shrink-0" />
                <p className="text-muted-foreground">All profile changes are synchronized across attendance logs automatically.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual Update Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Update Profile</DialogTitle>
            <DialogDescription>Modify administrative details for {editingStaff?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStaff} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Personnel Name</Label>
              <Input 
                id="editName" 
                value={editingStaff?.name || ""} 
                onChange={e => setEditingStaff(prev => prev ? {...prev, name: e.target.value} : null)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDept">Clinical Department</Label>
              <Input 
                id="editDept" 
                value={editingStaff?.department || ""} 
                onChange={e => setEditingStaff(prev => prev ? {...prev, department: e.target.value} : null)}
                required 
              />
            </div>
            <DialogFooter className="pt-4">
              <Button variant="ghost" type="button" onClick={() => setEditingStaff(null)}>Cancel</Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Institutional Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
