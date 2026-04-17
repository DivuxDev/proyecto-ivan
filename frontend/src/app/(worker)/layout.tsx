'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import WorkerNav from '@/components/layout/WorkerNav';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }
    // Admin que accede a rutas de worker → redirigir a dashboard
    if (user.role === 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted) return null;

  if (!isAuthenticated || !user || user.role !== 'WORKER') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {children}
      <WorkerNav />
    </div>
  );
}
