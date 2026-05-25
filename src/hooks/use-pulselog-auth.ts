
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { UserProfile, Organization } from "@/lib/types";
import { useParams } from "next/navigation";

export function usePulseLogAuth() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const params = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (user && db) {
        setLoading(true);
        try {
          const profileDocRef = doc(db, "users", user.uid);
          let profileDoc = await getDoc(profileDocRef);
          
          // Auto-resync for existing Auth users joining via a new Org Link
          if (!profileDoc.exists() && params.orgId) {
            const orgId = params.orgId as string;
            await setDoc(profileDocRef, {
              uid: user.uid,
              organizationId: orgId,
              email: user.email,
              name: user.displayName || "Returning User",
              role: 'staff',
              department: 'General',
              createdAt: serverTimestamp(),
            });
            profileDoc = await getDoc(profileDocRef);
          }

          if (profileDoc.exists()) {
            const userData = profileDoc.data() as UserProfile;
            setProfile(userData);

            // Super admins might not belong to an organization
            if (userData.organizationId) {
              const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId));
              if (orgDoc.exists()) {
                setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setProfile(null);
        setOrganization(null);
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, db, authLoading, params.orgId]);

  return { user, profile, organization, loading: loading || authLoading };
}
