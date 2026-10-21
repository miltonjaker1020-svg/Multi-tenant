import { z } from 'zod';
import { CitaEstado, Sexo, UserRole } from './types';

// ============================================
// AUTH VALIDATORS
// ============================================
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  clinicName: z.string().min(2, 'Nombre de la clínica requerido').max(100),
  clinicSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  adminName: z.string().min(2, 'Nombre requerido').max(100),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres').max(128),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// ============================================
// TENANT VALIDATORS
// ============================================
export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  domain: z.string().optional(),
  settings: z.object({
    timezone: z.string().default('America/Mexico_City'),
    currency: z.string().default('MXN'),
    language: z.string().default('es'),
  }).optional(),
});

// ============================================
// PACIENTE VALIDATORS
// ============================================
export const pacienteSchema = z.object({
  documento: z.string().min(8).max(20).regex(/^[0-9A-Za-z]+$/),
  nombre: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  fechaNacimiento: z.string().datetime().or(z.date()),
  sexo: z.nativeEnum(Sexo),
  telefono: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().max(200).optional(),
  antecedentes: z.string().optional(),
  alergias: z.string().optional(),
  observaciones: z.string().optional(),
});

export const pacienteUpdateSchema = pacienteSchema.partial();

export const pacienteFiltersSchema = z.object({
  search: z.string().optional(),
  sexo: z.nativeEnum(Sexo).optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  sortBy: z.enum(['nombre', 'apellidos', 'fechaNacimiento', 'createdAt']).default('apellidos'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================
// MEDICO VALIDATORS
// ============================================
export const medicoSchema = z.object({
  dni: z.string().min(8).max(20).regex(/^[0-9A-Za-z]+$/),
  nombre: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  especialidad: z.string().min(2).max(80),
  colegiado: z.string().min(5).max(50),
  telefono: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  horario: z.record(z.array(z.string())).default({}),
});

export const medicoUpdateSchema = medicoSchema.partial();

export const medicoFiltersSchema = z.object({
  search: z.string().optional(),
  especialidad: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

// ============================================
// CITA VALIDATORS
// ============================================
export const citaSchema = z.object({
  pacienteId: z.string().uuid(),
  medicoId: z.string().uuid(),
  fechaHora: z.string().datetime(),
  duracion: z.coerce.number().positive().max(480).default(30),
  sintomasPaciente: z.string().min(1, 'Los síntomas son requeridos').max(5000),
  observaciones: z.string().max(1000).optional(),
});

export const citaUpdateSchema = z.object({
  fechaHora: z.string().datetime().optional(),
  duracion: z.coerce.number().positive().max(480).optional(),
  estado: z.nativeEnum(CitaEstado).optional(),
  sintomasPaciente: z.string().max(5000).optional(),
  observaciones: z.string().max(1000).optional(),
  diagnosticoDoctor: z.string().optional(),
});

export const citaFiltersSchema = z.object({
  pacienteId: z.string().uuid().optional(),
  medicoId: z.string().uuid().optional(),
  estado: z.nativeEnum(CitaEstado).optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  sortBy: z.enum(['fechaHora', 'createdAt']).default('fechaHora'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================
// IA REPORT VALIDATORS
// ============================================
export const iaReportRequestSchema = z.object({
  citaId: z.string().uuid(),
  prompt: z.string().max(5000).optional(),
});

// ============================================
// QUERY/URL PARAMS
// ============================================
export const paginationSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type PacienteInput = z.infer<typeof pacienteSchema>;
export type PacienteUpdateInput = z.infer<typeof pacienteUpdateSchema>;
export type PacienteFilters = z.infer<typeof pacienteFiltersSchema>;
export type MedicoInput = z.infer<typeof medicoSchema>;
export type MedicoUpdateInput = z.infer<typeof medicoUpdateSchema>;
export type MedicoFilters = z.infer<typeof medicoFiltersSchema>;
export type CitaInput = z.infer<typeof citaSchema>;
export type CitaUpdateInput = z.infer<typeof citaUpdateSchema>;
export type CitaFilters = z.infer<typeof citaFiltersSchema>;
export type IaReportRequest = z.infer<typeof iaReportRequestSchema>;