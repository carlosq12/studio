
'use client';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { FirebaseProvider as FirebaseContextProvider } from './provider';
import { useMemo, useEffect, useState } from 'react';

type FirebaseInstances = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

let firebaseInstances: FirebaseInstances | null = null;

function getFirebaseInstances() {
    if (typeof window !== 'undefined' && !firebaseInstances) {
        const apps = getApps();
        const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        firebaseInstances = { app, auth, firestore };
    }
    return firebaseInstances;
}


export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<FirebaseInstances | null>(null);

  useEffect(() => {
    setInstances(getFirebaseInstances());
  }, []);

  const value = useMemo(() => ({
    app: instances?.app ?? null,
    auth: instances?.auth ?? null,
    firestore: instances?.firestore ?? null,
  }), [instances]);

  if (!instances) return null; // Previene errores de hidratación al no renderizar nada en el servidor

  return (
    <FirebaseContextProvider value={value}>
      {children}
    </FirebaseContextProvider>
  );
}
