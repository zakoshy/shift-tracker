
"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile, Organization } from "@/lib/types";

export function usePulseLogAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (profileDoc.exists()) {
          const userData = profileDoc.data() as UserProfile;
          setProfile(userData);

          const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId));
          if (orgDoc.exists()) {
            setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setOrganization(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, profile, organization, loading };
}
