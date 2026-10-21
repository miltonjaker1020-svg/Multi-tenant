'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pacienteSchema, type PacienteInput } from '@/lib/validators';
import { formatDate, calculateAge } from '@/lib/utils';

interface Paciente {
  id: string;
  documento: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  telefono?: string;
  email?: string;
  direccion?: string;
  antecedentes?: string;
  alergias?: string;
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PacienteInput>({
    resolver: zodResolver(pacienteSchema),
  });

  useEffect(() => {
    fetchPacientes();
  }, []);

  const fetchPacientes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pacientes');
      if (res.ok) {
        const data = await res.json();
        setPacientes(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PacienteInput) => {
    try {
      const url = editingPaciente ? `/api/pacientes/${editingPaciente.id}` : '/api/pacientes';
      const method = editingPaciente ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Error al guardar');
      fetchPacientes();
      setShowModal(false);
      setEditingPaciente(null);
      reset();
    } catch (err) {
      console.error('Error saving paciente:', err);
    }
  };

  const openEdit = (paciente: Paciente) => {
    setEditingPaciente(paciente);
    reset({
      documento: paciente.documento,
      nombre: paciente.nombre,
      apellidos: paciente.apellidos,
      fechaNacimiento: paciente.fechaNacimiento.split('T')[0],
      sexo: paciente.sexo,
      telefono: paciente.telefono || '',
      email: paciente.email || '',
      direccion: paciente.direccion || '',
      antecedentes: paciente.antecedentes || '',
      alergias: paciente.alergias || '',
      observaciones: '',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingPaciente(null);
    reset();
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este paciente?')) return;
    try {
      await fetch(`/api/pacientes/${id}`, { method: 'DELETE' });
      fetchPacientes();
    } catch (err) {
      console.error('Error deleting paciente:', err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Pacientes</h2>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo paciente
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edad / Sexo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pacientes.map((paciente) => (
                <tr key={paciente.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{paciente.documento}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{paciente.nombre} {paciente.apellidos}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {calculateAge(paciente.fechaNacimiento)} años • {paciente.sexo}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {paciente.telefono || '-'}<br />
                    {paciente.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(paciente)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(paciente.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pacientes.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay pacientes registrados</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">{editingPaciente ? 'Editar' : 'Nuevo'} paciente</h3>
              <button onClick={() => { setShowModal(false); setEditingPaciente(null); }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Documento</label>
                  <input {...register('documento')} className="w-full px-3 py-2 border rounded-lg" />
                  {errors.documento && <p className="text-red-500 text-sm mt-1">{errors.documento.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sexo</label>
                  <select {...register('sexo')} className="w-full px-3 py-2 border rounded-lg">
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="OTRO">Otro</option>
                  </select>
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
                  <label className="block text-sm font-medium mb-1">Fecha nacimiento</label>
                  <input {...register('fechaNacimiento')} type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <input {...register('telefono')} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input {...register('email')} type="email" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Dirección</label>
                  <input {...register('direccion')} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Antecedentes</label>
                  <textarea {...register('antecedentes')} rows={3} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alergias</label>
                  <textarea {...register('alergias')} rows={3} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowModal(false); setEditingPaciente(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
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