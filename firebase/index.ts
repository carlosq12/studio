'use client';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import type { Query, DocumentReference } from 'firebase/firestore';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

export * from './provider';

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
      errorEmitter.emit('permission-error', permissionError);
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
      errorEmitter.emit('permission-error', permissionError);
      setData(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ref]);

  return { data, loading };
}
