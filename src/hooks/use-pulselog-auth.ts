
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { UserProfile, Organization } from "@/lib/types";

export function usePulseLogAuth() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (user && db) {
        setLoading(true);
        try {
          const profileDoc = await getDoc(doc(db, "users", user.uid));
          if (profileDoc.exists()) {
            const userData = profileDoc.data() as UserProfile;
            setProfile(userData);

            const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId));
            if (orgDoc.exists()) {
              setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
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
  }, [user, db, authLoading]);

  return { user, profile, organization, loading: loading || authLoading };
}
