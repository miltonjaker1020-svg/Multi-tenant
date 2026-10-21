'use client';

import { useState } from 'react';
import { X, Loader2, Brain, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { InformeIA, Padecimiento } from '@/lib/types';

interface Cita {
  id: string;
  paciente: { nombre: string; apellidos: string };
  medico: { nombre: string; apellidos: string; especialidad: string };
  sintomasPaciente: string;
  informeIa?: InformeIA | null;
}

interface ModalIAReportProps {
  isOpen: boolean;
  onClose: () => void;
  cita: Cita | null;
  onGenerateReport: (citaId: string) => Promise<void>;
  loading?: boolean;
}

export function ModalIAReport({ isOpen, onClose, cita, onGenerateReport, loading = false }: ModalIAReportProps) {
  const [report, setReport] = useState<InformeIA | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cita?.informeIa) {
      setReport(cita.informeIa);
    } else {
      setReport(null);
    }
    setError('');
  }, [cita]);

  const handleGenerate = async () => {
    if (!cita) return;
    setGenerating(true);
    setError('');
    try {
      await onGenerateReport(cita.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar informe');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen || !cita) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Pre-informe IA
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Datos de la cita</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Paciente:</span>
                <p className="font-medium">{cita.paciente.nombre} {cita.paciente.apellidos}</p>
              </div>
              <div>
                <span className="text-gray-500">Médico:</span>
                <p className="font-medium">Dr. {cita.medico.nombre} {cita.medico.apellidos}</p>
              </div>
              <div>
                <span className="text-gray-500">Especialidad:</span>
                <p>{cita.medico.especialidad}</p>
              </div>
              <div>
                <span className="text-gray-500">Síntomas:</span>
                <p className="text-gray-600">{cita.sintomasPaciente}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!report ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No hay pre-informe generado</h4>
              <p className="text-gray-500 mb-6">Genera un pre-informe clínico basado en los síntomas del paciente usando IA.</p>
              <button
                onClick={handleGenerate}
                disabled={generating || loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Generar pre-informe con IA
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 border-t pt-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Cuadro clínico sugerido
                </h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{report.cuadro_clinico}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Padecimientos probables
                </h4>
                <div className="space-y-3">
                  {report.padecimientos.map((p: Padecimiento, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{p.enfermedad}</span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          {p.probabilidad_porcentaje}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Preguntas recomendadas para anamnesis
                </h4>
                <div className="space-y-2">
                  {report.preguntas_recomendadas.map((q: string, idx: number) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                      <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-gray-700">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={handleGenerate} disabled={generating || loading} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  Regenerar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}