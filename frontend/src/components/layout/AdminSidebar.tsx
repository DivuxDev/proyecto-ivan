'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Images,
  Map,
  LogOut,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/users', label: 'Trabajadores', icon: Users },
  { href: '/dashboard/photos', label: 'Fotos', icon: Images },
  { href: '/dashboard/map', label: 'Mapa', icon: Map },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: (typeof NAV_ITEMS)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-navy-600">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-amber-glow">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <p className="font-display text-base font-bold text-white tracking-wide">
              LINEAS<span className="text-brand-500">CAMPO</span>
            </p>
            <p className="text-navy-400 text-[10px] tracking-widest uppercase">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                    : 'text-navy-300 hover:text-white hover:bg-navy-600/50'
                )}
              >
                <Icon className={cn('w-4.5 h-4.5', active ? 'text-brand-400' : 'text-navy-400')} />
                {item.label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 bg-brand-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Usuario y logout */}
      <div className="px-3 py-4 border-t border-navy-600">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
          <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center">
            <span className="text-brand-400 text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-navy-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar desktop (oculto en móvil) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-navy-800 border-r border-navy-600 flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Topbar móvil (fija, reemplaza el botón flotante) */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 bg-navy-800 border-b border-navy-600 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center text-navy-300 hover:text-white rounded-xl hover:bg-navy-700 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-display text-sm font-bold text-white tracking-wide">
            LINEAS<span className="text-brand-500">CAMPO</span>
          </span>
        </div>
      </header>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-72 bg-navy-800 border-r border-navy-600 z-50 flex flex-col animate-fade-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-navy-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
