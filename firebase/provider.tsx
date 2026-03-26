'use client';

import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getFirestore, type Firestore, collection, onSnapshot, query, Query, DocumentReference } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';


// Explicitly type the context value
type FirebaseContextValue = {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
};

const FirebaseContext = createContext<FirebaseContextValue>({
  app: null,
  auth: null,
  firestore: null,
});

export function FirebaseProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: FirebaseContextValue;
}) {
  // Use useMemo to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => value, [value.app, value.auth, value.firestore]);
  return (
    <FirebaseContext.Provider value={memoizedValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);

export const useFirebaseApp = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  }
  return context.app;
}

export const useAuth = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context.auth;
}

export const useFirestore = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirestore must be used within a FirebaseProvider');
  }
  return context.firestore;
}

// A hook for memoizing Firebase queries and references.
export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T | null {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  return memoized;
}

export function useCollection<T>(query: Query | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(query, (snapshot) => {
      const result: T[] = [];
      snapshot.forEach((doc) => {
        result.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(result);
      setLoading(false);
    }, (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: (query as any)._query.path.segments.join('/'),
        operation: 'list',
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
      setData(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [query]);

  return { data, loading };
}

export function useDoc<T>(ref: DocumentReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }
    
    const unsubscribe = onSnapshot(ref, (doc) => {
      if (doc.exists()) {
        setData({ id: doc.id, ...doc.data() } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: 'get',
      });
      if (errorEmitter) {
        errorEmitter.emit('permission-error', permissionError);
      }
      setData(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ref]);

  return { data, loading };
}

