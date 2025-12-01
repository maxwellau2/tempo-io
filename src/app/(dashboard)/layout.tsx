import { Navigation } from '@/components/navigation';
import { NavigationProgress } from '@/components/NavigationProgress';
import { AlarmModal } from '@/components/timer/AlarmModal';
import { ToastProvider } from '@/components/ui';
import { SWRProvider } from '@/lib/swr-config';
import { Suspense } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <ToastProvider>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-8">
            {children}
          </main>
          <AlarmModal />
        </div>
      </ToastProvider>
    </SWRProvider>
  );
}
