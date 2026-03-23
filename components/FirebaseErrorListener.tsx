'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error(error); // Log the detailed error to the console for debugging

      if (process.env.NODE_ENV === 'development') {
        // In development, we want to see the full error overlay.
        // We throw it as an uncaught exception to trigger Next.js's overlay.
        // This gives the best debugging experience.
        setTimeout(() => {
          throw error;
        }, 0);
      } else {
        // In production, we show a friendly toast notification.
        toast({
          variant: "destructive",
          title: "Error de Permiso",
          description: "No tienes permiso para realizar esta acción.",
        });
      }
    };

    errorEmitter?.on('permission-error', handleError);

    return () => {
      errorEmitter?.off('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component does not render anything
}
