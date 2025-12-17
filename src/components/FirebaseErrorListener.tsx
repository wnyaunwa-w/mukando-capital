
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';

// This is a workaround to re-throw errors in a way that Next.js dev overlay can catch them.
const throwAsync = (error: Error) => {
  setTimeout(() => {
    throw error;
  }, 0);
};

export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: Error) => {
      // Re-throw the error inside a timeout to break out of the promise chain
      // and allow Next.js's development error overlay to catch it.
      throwAsync(error);
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, []);

  return null; // This component does not render anything.
}
