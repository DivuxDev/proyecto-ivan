'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Camera, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/worker', label: 'Inicio', icon: Home, exact: true },
  { href: '/worker/upload', label: 'Subir foto', icon: Camera },
  { href: '/worker/history', label: 'Historial', icon: Clock },
];

export default function WorkerNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="flex">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const isUpload = tab.href === '/worker/upload';

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors',
                isUpload
                  ? active
                    ? 'text-brand-600'
                    : 'text-gray-500'
                  : active
                  ? 'text-brand-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {isUpload ? (
                <div
                  className={cn(
                    '-mt-5 w-14 h-14 rounded-full flex items-center justify-center shadow-brand-glow transition-all',
                    active
                      ? 'bg-brand-600 scale-105'
                      : 'bg-brand-500 hover:bg-brand-600'
                  )}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
              ) : (
                <Icon
                  className={cn(
                    'w-5 h-5',
                    active ? 'text-brand-600' : 'text-gray-400'
                  )}
                />
              )}
              <span className={isUpload ? 'mt-1' : ''}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
