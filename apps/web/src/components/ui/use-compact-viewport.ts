'use client';

import { useEffect, useState } from 'react';

/** True below the `sm` breakpoint or on touch-only devices. */
export function useCompactViewport(query = '(max-width: 639px)') {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return compact;
}
