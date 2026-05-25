
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // In development, this will help surface the exact rule that failed
      console.error('[Firebase Security Alert]', error.context);
      
      toast({
        variant: 'destructive',
        title: 'Security Protocol Violation',
        description: `Operation "${error.context.operation}" denied on path: ${error.context.path}. Check Security Rules.`,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
