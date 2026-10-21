'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

interface Cita {
  id: string;
  fechaHora: string;
  duracion: number;
  estado: 'PENDIENTE' | 'ATENDIDO' | 'CANCELADO';
  sintomasPaciente: string;
  paciente: { nombre: string; apellidos: string };
  medico: { nombre: string; apellidos: string; especialidad: string };
}

export default function DashboardPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchCitas();
  }, [selectedDate]);

  const fetchCitas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/citas?fechaDesde=${selectedDate}T00:00:00&fechaHasta=${selectedDate}T23:59:59`);
      if (res.ok) {
        const data = await res.json();
        setCitas(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching citas:', err);
    } finally {
      setLoading(false);
    }
  };

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
      case 'PENDIENTE': return <Clock className="w-4 h-4" />;
      case 'ATENDIDO': return <CheckCircle className="w-4 h-4" />;
      case 'CANCELADO': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando agenda...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agenda del día</h2>
          <p className="text-gray-600">{formatDate(selectedDate)}</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {citas.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay citas programadas</h3>
          <p className="text-gray-500 mt-1">No hay citas para {formatDate(selectedDate)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {citas.map((cita) => (
            <div
              key={cita.id}
              className="bg-white p-4 rounded-xl border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {formatTime(cita.fechaHora)} - {formatTime(new Date(new Date(cita.fechaHora).getTime() + cita.duracion * 60000))}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getEstadoColor(cita.estado)}`}>
                        {getEstadoIcon(cita.estado)}
                        {cita.estado}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{cita.paciente.nombre} {cita.paciente.apellidos}</p>
                    <p className="text-sm text-gray-500">Dr. {cita.medico.nombre} {cita.medico.apellidos} • {cita.medico.especialidad}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 line-clamp-2">{cita.sintomasPaciente}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}