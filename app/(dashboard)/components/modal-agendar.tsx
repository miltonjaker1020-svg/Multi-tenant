'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { citaSchema, type CitaInput } from '@/lib/validators';
import { X, Calendar, Clock, User, Stethoscope, Loader2 } from 'lucide-react';
import { generateIdempotencyKey } from '@/lib/utils';

interface Paciente {
  id: string;
  nombre: string;
  apellidos: string;
  documento: string;
}

interface Medico {
  id: string;
  nombre: string;
  apellidos: string;
  especialidad: string;
}

interface ModalAgendarProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CitaInput & { idempotencyKey: string }) => Promise<void>;
  pacientes: Paciente[];
  medicos: Medico[];
  loading?: boolean;
  editingCita?: CitaInput & { id: string } | null;
}

export function ModalAgendar({
  isOpen,
  onClose,
  onSubmit,
  pacientes,
  medicos,
  loading = false,
  editingCita = null,
}: ModalAgendarProps) {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CitaInput>({
    resolver: zodResolver(citaSchema),
    defaultValues: {
      duracion: 30,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (editingCita) {
        setValue('pacienteId', editingCita.pacienteId);
        setValue('medicoId', editingCita.medicoId);
        setValue('fechaHora', editingCita.fechaHora);
        setValue('duracion', editingCita.duracion);
        setValue('sintomasPaciente', editingCita.sintomasPaciente);
        setValue('observaciones', editingCita.observaciones || '');
      } else {
        reset({ duracion: 30 });
      }
    }
  }, [isOpen, editingCita, reset, setValue]);

  const handleFormSubmit = async (data: CitaInput) => {
    const idempotencyKey = generateIdempotencyKey();
    await onSubmit({ ...data, idempotencyKey });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{editingCita ? 'Reprogramar' : 'Agendar nueva'} cita</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleFormSubmit(handleFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <User className="w-4 h-4" /> Paciente
              </label>
              <select {...register('pacienteId')} className="w-full px-3 py-2 border rounded-lg" required>
                <option value="">Seleccionar paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} ({p.documento})</option>
                ))}
              </select>
              {errors.pacienteId && <p className="text-red-500 text-sm mt-1">{errors.pacienteId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Stethoscope className="w-4 h-4" /> Médico
              </label>
              <select {...register('medicoId')} className="w-full px-3 py-2 border rounded-lg" required>
                <option value="">Seleccionar médico</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>Dr. {m.nombre} {m.apellidos} - {m.especialidad}</option>
                ))}
              </select>
              {errors.medicoId && <p className="text-red-500 text-sm mt-1">{errors.medicoId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Fecha y hora
              </label>
              <input
                {...register('fechaHora')}
                type="datetime-local"
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              {errors.fechaHora && <p className="text-red-500 text-sm mt-1">{errors.fechaHora.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Duración (min)
              </label>
              <input
                {...register('duracion', { valueAsNumber: true })}
                type="number"
                min="15"
                max="480"
                step="15"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Síntomas del paciente *</label>
            <textarea
              {...register('sintomasPaciente')}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Describe los síntomas principales..."
              required
            />
            {errors.sintomasPaciente && <p className="text-red-500 text-sm mt-1">{errors.sintomasPaciente.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observaciones</label>
            <textarea
              {...register('observaciones')}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Notas adicionales..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isSubmitting || loading} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {isSubmitting || loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting || loading ? 'Guardando...' : (editingCita ? 'Actualizar' : 'Agendar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}