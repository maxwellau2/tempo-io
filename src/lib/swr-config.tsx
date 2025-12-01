'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';
import { SWR_CONFIG } from '@/lib/constants';

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Keep data fresh but don't refetch on every focus
        revalidateOnFocus: false,
        // Revalidate when reconnecting to network
        revalidateOnReconnect: true,
        // Cache data before considering it stale
        dedupingInterval: SWR_CONFIG.DEDUPING_INTERVAL,
        // Show stale data while revalidating
        keepPreviousData: true,
        // Retry failed requests
        errorRetryCount: SWR_CONFIG.ERROR_RETRY_COUNT,
        // Don't refetch on mount if data exists (key for snappy navigation)
        revalidateIfStale: false,
        // Fallback to showing cached data immediately
        suspense: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
