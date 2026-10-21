'use client';

import { formatDate, formatTime } from '@/lib/utils';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, MoreHorizontal } from 'lucide-react';

interface Cita {
  id: string;
  fechaHora: string;
  duracion: number;
  estado: 'PENDIENTE' | 'ATENDIDO' | 'CANCELADO';
  sintomasPaciente: string;
  paciente: { id: string; nombre: string; apellidos: string; documento: string };
  medico: { id: string; nombre: string; apellidos: string; especialidad: string };
}

interface CitasTableProps {
  citas: Cita[];
  onEdit?: (cita: Cita) => void;
  onDelete?: (id: string) => void;
  onViewIAReport?: (cita: Cita) => void;
}

export function CitasTable({ citas, onEdit, onDelete, onViewIAReport }: CitasTableProps) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800';
      case 'ATENDIDO': return 'bg-green-100 text-green-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return <Clock className="w-3 h-3" />;
      case 'ATENDIDO': return <CheckCircle className="w-3 h-3" />;
      case 'CANCELADO': return <XCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  if (citas.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No hay citas</h3>
        <p className="text-gray-500 mt-1">No se encontraron citas para los filtros seleccionados</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médico</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Síntomas</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {citas.map((cita) => (
              <tr key={cita.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{formatTime(cita.fechaHora)}</span>
                    <span className="text-gray-400">-</span>
                    <span>{formatTime(new Date(new Date(cita.fechaHora).getTime() + cita.duracion * 60000))}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{cita.paciente.nombre} {cita.paciente.apellidos}</p>
                  <p className="text-sm text-gray-500 font-mono">{cita.paciente.documento}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">Dr. {cita.medico.nombre} {cita.medico.apellidos}</p>
                  <p className="text-sm text-gray-500">{cita.medico.especialidad}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getEstadoColor(cita.estado)}`}>
                    {getEstadoIcon(cita.estado)}
                    {cita.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600 line-clamp-1 max-w-xs">{cita.sintomasPaciente}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onViewIAReport && cita.estado === 'ATENDIDO' && (
                      <button
                        onClick={() => onViewIAReport(cita)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Ver pre-informe IA"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(cita)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(cita.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}