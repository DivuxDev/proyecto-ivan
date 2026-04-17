'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/lib/utils';
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Shield,
  HardHat,
} from 'lucide-react';
import type { User } from '@/types';

const createSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'WORKER']),
  phone: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await usersApi.list();
      return res.data.data as User[];
    },
  });

  const users = (data ?? []).filter(
    u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'WORKER' },
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => usersApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreate(false);
      reset();
      setFormError('');
    },
    onError: err => setFormError(getErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (user: User) =>
      usersApi.update(user.id, { active: !user.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteUser(null);
    },
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1">Trabajadores</h1>
          <p className="text-navy-300 text-sm">Gestión de usuarios y accesos</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setFormError(''); reset(); }}
          className="self-start sm:self-auto flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Buscador */}
      <div className="admin-card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="input-dark pl-9 w-full"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-500">
              <tr>
                <th className="pb-4 text-left text-navy-300 font-medium">Usuario</th>
                <th className="pb-4 text-left text-navy-300 font-medium hidden md:table-cell">Rol</th>
                <th className="pb-4 text-left text-navy-300 font-medium hidden lg:table-cell">Fotos</th>
                <th className="pb-4 text-left text-navy-300 font-medium hidden xl:table-cell">Creado</th>
                <th className="pb-4 text-left text-navy-300 font-medium">Estado</th>
                <th className="pb-4 text-right text-navy-300 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-600">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="py-4">
                        <div className="h-4 bg-navy-600 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-navy-300">
                    {search ? 'No se encontraron usuarios' : 'Sin usuarios'}
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-navy-600/30 transition-colors">
                    <td className="py-3.5">
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-navy-300 text-xs mt-0.5">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 hidden md:table-cell">
                      <span className={`role-badge ${
                        user.role === 'ADMIN'
                          ? 'bg-brand-500/20 text-brand-400'
                          : 'bg-navy-500/40 text-navy-200'
                      }`}>
                        {user.role === 'ADMIN' ? (
                          <><Shield className="w-3 h-3 mr-1" />Admin</>
                        ) : (
                          <><HardHat className="w-3 h-3 mr-1" />Trabajador</>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 text-navy-200 hidden lg:table-cell">
                      {user._count?.photos ?? 0}
                    </td>
                    <td className="py-3.5 text-navy-300 text-xs hidden xl:table-cell">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-3.5">
                      <button
                        onClick={() => toggleActiveMutation.mutate(user)}
                        className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
                          user.active
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        {user.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditUser(user)}
                          className="p-1.5 text-navy-300 hover:text-white hover:bg-navy-500 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="p-1.5 text-navy-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — Crear usuario */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-navy-700 border border-navy-500 rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white text-lg">Nuevo usuario</h3>
              <button onClick={() => setShowCreate(false)} className="text-navy-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(d => createMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-navy-200 mb-1">Nombre</label>
                  <input {...register('name')} className="input-dark w-full" placeholder="Nombre completo" />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-navy-200 mb-1">Email</label>
                  <input {...register('email')} type="email" className="input-dark w-full" placeholder="email@empresa.com" />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-200 mb-1">Contraseña</label>
                  <input {...register('password')} type="password" className="input-dark w-full" placeholder="Mínimo 6 chars" />
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-200 mb-1">Rol</label>
                  <select {...register('role')} className="input-dark w-full">
                    <option value="WORKER">Trabajador</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-navy-200 mb-1">Teléfono (opcional)</label>
                  <input {...register('phone')} type="tel" className="input-dark w-full" placeholder="+34 666 000 000" />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-navy-500 text-navy-200 hover:text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Confirmar eliminación */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-navy-700 border border-navy-500 rounded-2xl p-6 w-full max-w-sm animate-slide-up">
            <div className="flex flex-col items-center text-center gap-3 mb-5">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Desactivar usuario</h3>
                <p className="text-navy-300 text-sm">
                  ¿Desactivar a <strong className="text-white">{deleteUser.name}</strong>?
                  Sus fotos se mantendrán.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 py-2.5 border border-navy-500 text-navy-200 rounded-xl text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteUser.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Desactivando...' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
