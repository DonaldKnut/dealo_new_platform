'use client';

import { useCallback, useState } from 'react';

export function useServerFormStatus() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const clear = useCallback(() => {
    setServerError(null);
    setServerMessage(null);
  }, []);

  return {
    serverError,
    serverMessage,
    setServerError,
    setServerMessage,
    clear,
  };
}
