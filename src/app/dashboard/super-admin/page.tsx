
"use client";

import { useState, useMemo } from "react";
import { usePulseLogAuth } from "@/hooks/use-pulselog-auth";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, doc, updateDoc, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Building, 
  Users, 
  ShieldAlert, 
  Activity, 
  Search, 
  Loader2, 
  TrendingUp,
  Globe,
  Lock,
  Unlock,
  Info
} from "lucide-react";
import { Organization, UserProfile } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function SuperAdminDashboard() {
  const { profile } = usePulseLogAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Queries
  const orgsQuery = useMemo(() => query(collection(db, "organizations"), orderBy("createdAt", "desc")), [db]);
  const usersQuery = useMemo(() => query(collection(db, "users")), [db]);

  const { data: organizations, loading: orgsLoading } = useCollection<Organization>(orgsQuery);
  const { data: allUsers, loading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const filteredOrgs = useMemo(() => {
    if (!organizations) return [];
    return organizations.filter(org => 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [organizations, searchTerm]);

  const stats = {
    totalOrgs: organizations?.length || 0,
    activeOrgs: organizations?.filter(o => !o.suspended).length || 0,
    suspendedOrgs: organizations?.filter(o => o.suspended).length || 0,
    totalUsers: allUsers?.length || 0
  };

  const handleToggleSuspension = async (orgId: string, currentStatus: boolean) => {
    setUpdatingId(orgId);
    try {
      await updateDoc(doc(db, "organizations", orgId), {
        suspended: !currentStatus
      });
      toast({
        title: !currentStatus ? "Organization Suspended" : "Access Restored",
        description: `Facility ${orgId} status has been updated.`,
      });
    } catch (err) {
      toast({ title: "Update Failed", description: "Authorization error.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  if (profile?.role !== 'super-admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto opacity-20" />
          <h2 className="text-2xl font-bold">Unauthorized Access</h2>
          <p className="text-muted-foreground">This area is reserved for the Platform Super Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">PulseLog Global SaaS Controller</span>
          </div>
          <h1 className="text-3xl font-headline font-extrabold text-foreground tracking-tight">System Governance</h1>
          <p className="text-sm text-muted-foreground mt-1">Institutional oversight and tenant lifecycle management.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tenants..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground rounded-2xl">
          <CardContent className="p-6">
            <Building className="h-5 w-5 opacity-60 mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Total Tenants</p>
            <h3 className="text-4xl font-black tracking-tighter">{stats.totalOrgs}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <CardContent className="p-6">
            <Activity className="h-5 w-5 text-green-600 mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Active Orgs</p>
            <h3 className="text-4xl font-black tracking-tighter text-green-600">{stats.activeOrgs}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <CardContent className="p-6">
            <Lock className="h-5 w-5 text-destructive mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Suspended</p>
            <h3 className="text-4xl font-black tracking-tighter text-destructive">{stats.suspendedOrgs}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <CardContent className="p-6">
            <Users className="h-5 w-5 text-primary mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Global Users</p>
            <h3 className="text-4xl font-black tracking-tighter text-primary">{stats.totalUsers}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-4">
        <Info className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">SaaS Maintenance Advisory</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Deleting an organization or user record in Firestore removes their data, but **does not delete their Firebase Authentication login**. 
            To truly clear an email address for reuse, you must navigate to the **Authentication tab** in the Firebase Console and delete the user record there. 
            Suspension here blocks access immediately without needing console intervention.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-none bg-card">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tenant Management Matrix
          </CardTitle>
          <CardDescription className="text-xs uppercase font-bold tracking-widest opacity-60">Global organization state and access controls</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {orgsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6 text-[10px] font-bold uppercase tracking-widest">Organization Name</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">System ID</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Established</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-bold uppercase tracking-widest">Access Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/10 group transition-colors">
                    <TableCell className="pl-6 font-bold text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
                          <Building className="h-4 w-4 text-primary" />
                        </div>
                        <span>{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] opacity-60">{org.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {org.createdAt?.toDate ? format(org.createdAt.toDate(), 'MMM d, yyyy') : 'Legacy'}
                    </TableCell>
                    <TableCell>
                      {org.suspended ? (
                        <Badge variant="destructive" className="rounded-lg text-[9px] uppercase">Suspended</Badge>
                      ) : (
                        <Badge className="bg-green-600 text-white rounded-lg text-[9px] uppercase">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-3">
                        {updatingId === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {org.suspended ? 'Locked' : 'Unlocked'}
                            </span>
                            <Switch 
                              checked={!org.suspended} 
                              onCheckedChange={() => handleToggleSuspension(org.id, !!org.suspended)}
                              className="data-[state=checked]:bg-green-600"
                            />
                          </>
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
    </div>
  );
}
