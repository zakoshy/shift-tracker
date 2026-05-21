'use client';

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

interface FirebaseContextType {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

/**
 * The core Firebase Provider that holds the initialized service instances.
 */
export function FirebaseProvider({
  children,
  firebaseApp,
  firestore,
  auth,
}: {
  children: React.ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}) {
  return (
    <FirebaseContext.Provider value={{ firebaseApp, firestore, auth }}>
      {children}
    </FirebaseContext.Provider>
  );
}

/**
 * Hook to access the full Firebase context.
 */
export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

/**
 * Hook to access the FirebaseApp instance.
 */
export const useFirebaseApp = () => useFirebase().firebaseApp;

/**
 * Hook to access the Firestore instance.
 */
export const useFirestore = () => useFirebase().firestore;

/**
 * Hook to access the Auth instance.
 */
export const useAuth = () => useFirebase().auth;
