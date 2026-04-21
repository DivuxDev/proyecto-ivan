'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError('');
    try {
      const user = await login(data.email, data.password);
      if (user.role === 'ADMIN') {
        router.replace('/dashboard');
      } else {
        router.replace('/worker');
      }
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-800 bg-grid-dark flex">
      {/* Panel izquierdo — branding (sólo visible en md+) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-center px-12 lg:px-20 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center shadow-amber-glow">
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white tracking-wide">
                TAG<span className="text-brand-500">MAP</span>
              </h1>
              <p className="text-navy-300 text-xs tracking-widest uppercase">
                Gestión de campo
              </p>
            </div>
          </div>

          <h2 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Control total
            <br />
            <span className="text-brand-500">desde el campo.</span>
          </h2>

          <p className="text-navy-200 text-lg leading-relaxed mb-10">
            Registra, geoetiqueta y supervisa el trabajo diario de tu equipo en
            tiempo real. Todo desde el móvil.
          </p>

          {/* Features */}
          <div className="space-y-3">
            {[
              { icon: '📍', text: 'Fotos geolocalizadas automáticamente' },
              { icon: '📊', text: 'Dashboard con métricas y actividad' },
              { icon: '🗺️', text: 'Mapa interactivo de trabajos' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-navy-200 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-display text-xl font-bold text-white tracking-wide">
              LINEAS<span className="text-brand-500">CAMPO</span>
            </span>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-1">Iniciar sesión</h3>
            <p className="text-navy-300 text-sm">Accede a tu cuenta de trabajo</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="input-dark pl-9"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-dark pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-100"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Error del servidor */}
            {serverError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{serverError}</p>
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-semibold py-3 rounded-lg transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-navy-300 text-sm">
            ¿Primera vez?{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Crea tu cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
