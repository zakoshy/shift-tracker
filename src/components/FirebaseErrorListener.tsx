
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Robust logging for development
      const context = error.context || {};
      console.error('[Firebase Security Alert]', {
        operation: context.operation,
        path: context.path,
        message: error.message
      });
      
      toast({
        variant: 'destructive',
        title: 'Security Protocol Violation',
        description: `Operation "${context.operation || 'unknown'}" denied on path: ${context.path || 'unknown'}. Check Security Rules and Query Filters.`,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
