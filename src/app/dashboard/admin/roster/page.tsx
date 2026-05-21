
"use client";

import { useState, useMemo } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, deleteDoc } from "firebase/firestore";
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  QrCode, 
  Trash2, 
  Building2,
  Copy,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

export default function StaffRosterPage() {
  const { profile, organization } = usePulseLogAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Memoize query to prevent infinite loops
  const staffQuery = useMemo(() => {
    if (!profile?.organizationId) return null;
    return query(
      collection(db, "users"),
      where("organizationId", "==", profile.organizationId)
    );
  }, [db, profile?.organizationId]);

  const { data: staff, loading } = useCollection<UserProfile>(staffQuery);

  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/join/${profile?.organizationId}`
    : "";

  const handleCopyLink = () => {
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Institutional Invite</DialogTitle>
              <DialogDescription>
                Staff can scan this code or use the link to register their profile at {organization?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-6 py-6">
              <div className="bg-white p-6 rounded-2xl border-2 border-primary/10 shadow-md flex items-center justify-center">
                {inviteUrl ? (
                  <QRCodeSVG 
                    value={inviteUrl} 
                    size={200} 
                    level="H" 
                    includeMargin={false}
                    className="text-primary"
                  />
                ) : (
                  <QrCode className="h-48 w-48 text-muted-foreground animate-pulse" />
                )}
              </div>
              
              <div className="w-full space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Registration URL</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border text-xs font-mono break-all">
                  <span className="flex-1">{inviteUrl}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopyLink}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground italic">
                Scanning this will open the onboarding form on the staff member's device.
              </p>
            </div>
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
            <CardDescription>Total active staff profiles within {organization?.name}</CardDescription>
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
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-accent">Onboarding Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex gap-3">
                <QrCode className="h-5 w-5 text-accent shrink-0" />
                <p className="text-muted-foreground">Print the onboarding QR code and post it in the staff breakroom for easy self-registration.</p>
              </div>
              <div className="flex gap-3">
                <Building2 className="h-5 w-5 text-accent shrink-0" />
                <p className="text-muted-foreground">Staff profiles are automatically linked to your organization's security domain.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
