'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validators';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setValue } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const clinicName = watch('clinicName');
  const clinicSlug = watch('clinicSlug');

  const onSubmit = async (data: RegisterInput) => {
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || 'Error al registrar');

      router.push('/login?registered=true');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

  if (step === 1) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold text-center mb-6">Registrar nueva clínica</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit(() => setStep(2))} className="space-y-4">
          <div>
            <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700 mb-1">Nombre de la clínica</label>
            <input
              {...register('clinicName', { required: 'Requerido' })}
              type="text"
              id="clinicName"
              onChange={(e) => {
                setValue('clinicName', e.target.value);
                if (!watch('clinicSlug') || watch('clinicSlug') === slugify(e.target.value)) {
                  setValue('clinicSlug', slugify(e.target.value));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Clínica San José"
            />
          </div>

          <div>
            <label htmlFor="clinicSlug" className="block text-sm font-medium text-gray-700 mb-1">Subdominio (slug)</label>
            <div className="flex gap-2">
              <span className="px-3 py-2 bg-gray-100 rounded-l-lg text-gray-500">https://</span>
              <input
                {...register('clinicSlug', { required: 'Requerido', pattern: /^[a-z0-9-]+$/ })}
                type="text"
                id="clinicSlug"
                className="flex-1 px-3 py-2 border-t border-r border-b border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="clinica-san-jose"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Tus usuarios accederán en: <code className="bg-gray-100 px-1 rounded">{clinicSlug || 'tu-clinica'}</code>.meditenant.app</p>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Continuar
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta? <Link href="/login" className="text-blue-600 hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border">
      <h1 className="text-2xl font-bold text-center mb-6">Crear cuenta de administrador</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('clinicName')} />
        <input type="hidden" {...register('clinicSlug')} />

        <div>
          <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
          <input
            {...register('adminName')}
            type="text"
            id="adminName"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            {...register('adminEmail')}
            type="email"
            id="adminEmail"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <input
            {...register('adminPassword')}
            type="password"
            id="adminPassword"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
          <input
            {...register('confirmPassword')}
            type="password"
            id="confirmPassword"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Creando clínica...' : 'Crear clínica y cuenta'}
        </button>
      </form>

      <button onClick={() => setStep(1)} className="mt-4 w-full text-gray-600 hover:underline">
        ← Volver
      </button>
    </div>
  );
}