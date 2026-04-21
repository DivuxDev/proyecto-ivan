'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

// Página raíz: redirige según el rol del usuario
export default function RootPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (user.role === 'ADMIN') {
      router.replace('/dashboard');
    } else {
      router.replace('/worker');
    }
  }, [mounted, isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-navy-800">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-brand-500/30 rounded-full" />
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
        <p className="text-navy-200 text-sm font-medium">Cargando TagMap...</p>
      </div>
    </div>
  );
}
