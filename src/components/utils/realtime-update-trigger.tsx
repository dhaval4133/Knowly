
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RealtimeUpdateTriggerProps {
  intervalMs?: number;
}

export default function RealtimeUpdateTrigger({ intervalMs = 15000 }: RealtimeUpdateTriggerProps) {
  const router = useRouter();

  useEffect(() => {
    const intervalId = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [router, intervalMs]);

  return null; // This component does not render anything
}
