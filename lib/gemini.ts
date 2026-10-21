import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';
import { logger } from './logger';
import { ExternalServiceError } from './errors';
import { InformeIA, Padecimiento } from './types';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

const SYSTEM_PROMPT = `
Eres un asistente médico experto que genera pre-informes clínicos estructurados.
Tu objetivo es crear un resumen profesional basado en los datos de la cita y el paciente.
El informe será revisado por un médico antes de ser entregado al paciente.

FORMATO DE SALIDA (JSON válido):
{
  "cuadro_clinico": "string",
  "padecimientos": [
    { "enfermedad": "string", "probabilidad_porcentaje": number }
  ],
  "preguntas_recomendadas": ["string"]
}

IMPORTANTE:
- No des diagnósticos definitivos, usa lenguaje sugerido ("podría indicar", "se sugiere evaluar")
- Sé conciso y profesional
- No inventes información que no esté en los datos proporcionados
- Si faltan datos, indícalo claramente
- Responde SOLO con el JSON válido, sin markdown ni texto adicional
`.trim();

const generateReportPrompt = (data: {
  patientName: string;
  patientAge: number;
  patientSex: string;
  motivo: string;
  antecedentes?: string;
  alergias?: string;
  observaciones?: string;
  doctorSpecialty: string;
}): string => `
${SYSTEM_PROMPT}

DATOS DE LA CITA:
- **Paciente:** ${data.patientName}
- **Edad:** ${data.patientAge} años
- **Sexo:** ${data.patientSex}
- **Especialidad del médico:** ${data.doctorSpecialty}
- **Motivo de consulta:** ${data.motivo}
${data.antecedentes ? `- **Antecedentes:** ${data.antecedentes}` : ''}
${data.alergias ? `- **Alergias:** ${data.alergias}` : ''}
${data.observaciones ? `- **Observaciones:** ${data.observaciones}` : ''}

Genera el pre-informe clínico en formato JSON:
`.trim();

export interface IaReportInput {
  patientName: string;
  patientAge: number;
  patientSex: string;
  motivo: string;
  antecedentes?: string;
  alergias?: string;
  observaciones?: string;
  doctorSpecialty: string;
  customPrompt?: string;
}

export interface IaReportOutput {
  report: InformeIA;
  tokensUsed: number;
  latencyMs: number;
}

export async function generateIaReport(input: IaReportInput): Promise<IaReportOutput> {
  const startTime = Date.now();

  try {
    const prompt = input.customPrompt || generateReportPrompt(input);

    logger.debug({ model: env.GEMINI_MODEL, promptLength: prompt.length }, 'Generating IA report');

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let report: InformeIA;
    try {
      report = JSON.parse(text);
    } catch {
      logger.warn('Gemini response was not valid JSON, attempting to extract');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Gemini response as JSON');
      }
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;

    logger.info({ latencyMs, tokensUsed }, 'IA report generated');

    return {
      report,
      tokensUsed,
      latencyMs,
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Failed to generate IA report');
    throw new ExternalServiceError('Gemini', error instanceof Error ? error : new Error('Unknown error'));
  }
}

export async function* generateIaReportStream(input: IaReportInput): AsyncGenerator<string, IaReportOutput, undefined> {
  const startTime = Date.now();

  try {
    const prompt = input.customPrompt || generateReportPrompt(input);

    const result = await model.generateContentStream(prompt);

    let fullReport = '';
    let totalTokens = 0;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullReport += text;
      totalTokens += chunk.usageMetadata?.totalTokenCount ?? 0;
      yield text;
    }

    let report: InformeIA;
    try {
      report = JSON.parse(fullReport);
    } catch {
      const jsonMatch = fullReport.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse streamed Gemini response as JSON');
      }
    }

    const latencyMs = Date.now() - startTime;

    logger.info({ latencyMs, tokensUsed: totalTokens }, 'IA report streamed');

    return {
      report,
      tokensUsed: totalTokens,
      latencyMs,
    };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Failed to stream IA report');
    throw new ExternalServiceError('Gemini', error instanceof Error ? error : new Error('Unknown error'));
  }
}

export function validateIaReportInput(input: IaReportInput): string[] {
  const errors: string[] = [];

  if (!input.patientName?.trim()) errors.push('Nombre del paciente requerido');
  if (!input.motivo?.trim()) errors.push('Motivo de consulta requerido');
  if (input.patientAge < 0 || input.patientAge > 150) errors.push('Edad inválida');
  if (!['MASCULINO', 'FEMENINO', 'OTRO'].includes(input.patientSex)) errors.push('Sexo inválido');

  return errors;
}

export function validateInformeIA(report: any): report is InformeIA {
  return (
    typeof report === 'object' &&
    typeof report.cuadro_clinico === 'string' &&
    Array.isArray(report.padecimientos) &&
    report.padecimientos.every(
      (p: any) => typeof p.enfermedad === 'string' && typeof p.probabilidad_porcentaje === 'number'
    ) &&
    Array.isArray(report.preguntas_recomendadas) &&
    report.preguntas_recomendadas.every((q: any) => typeof q === 'string')
  );
}