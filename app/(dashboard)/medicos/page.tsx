'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Stethoscope } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicoSchema, type MedicoInput } from '@/lib/validators';

interface Medico {
  id: string;
  dni: string;
  nombre: string;
  apellidos: string;
  especialidad: string;
  colegiado: string;
  telefono?: string;
  email?: string;
  horario: Record<string, string[]>;
}

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMedico, setEditingMedico] = useState<Medico | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MedicoInput>({
    resolver: zodResolver(medicoSchema),
  });

  useEffect(() => {
    fetchMedicos();
  }, []);

  const fetchMedicos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/medicos');
      if (res.ok) {
        const data = await res.json();
        setMedicos(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching medicos:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: MedicoInput) => {
    try {
      const url = editingMedico ? `/api/medicos/${editingMedico.id}` : '/api/medicos';
      const method = editingMedico ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Error al guardar');
      fetchMedicos();
      setShowModal(false);
      setEditingMedico(null);
      reset();
    } catch (err) {
      console.error('Error saving medico:', err);
    }
  };

  const openEdit = (medico: Medico) => {
    setEditingMedico(medico);
    reset({
      dni: medico.dni,
      nombre: medico.nombre,
      apellidos: medico.apellidos,
      especialidad: medico.especialidad,
      colegiado: medico.colegiado,
      telefono: medico.telefono || '',
      email: medico.email || '',
      horario: medico.horario,
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingMedico(null);
    reset();
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este médico?')) return;
    try {
      await fetch(`/api/medicos/${id}`, { method: 'DELETE' });
      fetchMedicos();
    } catch (err) {
      console.error('Error deleting medico:', err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-blue-600" />
          Médicos
        </h2>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo médico
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especialidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colegiado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {medicos.map((medico) => (
                <tr key={medico.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{medico.dni}</td>
                  <td className="px-4 py-3 font-medium">{medico.nombre} {medico.apellidos}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{medico.especialidad}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{medico.colegiado}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {medico.telefono || '-'}<br />
                    {medico.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(medico)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(medico.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {medicos.length === 0 && (
          <div className="text-center py-12">
            <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay médicos registrados</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">{editingMedico ? 'Editar' : 'Nuevo'} médico</h3>
              <button onClick={() => { setShowModal(false); setEditingMedico(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">DNI</label>
                  <input {...register('dni')} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Colegiado</label>
                  <input {...register('colegiado')} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input {...register('nombre')} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apellidos</label>
                  <input {...register('apellidos')} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Especialidad</label>
                  <input {...register('especialidad')} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <input {...register('telefono')} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input {...register('email')} type="email" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Horario (JSON)</label>
                <textarea
                  {...register('horario', { valueAsString: true })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  placeholder='{"lunes": ["09:00-14:00"], "martes": ["09:00-14:00"]}'
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowModal(false); setEditingMedico(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}