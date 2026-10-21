export interface Padecimiento {
  enfermedad: string;
  probabilidad_porcentaje: number;
}

export interface InformeIA {
  cuadro_clinico: string;
  padecimientos: Padecimiento[];
  preguntas_recomendadas: string[];
}

export enum CitaEstado {
  PENDIENTE = 'PENDIENTE',
  ATENDIDO = 'ATENDIDO',
  CANCELADO = 'CANCELADO',
}

export enum Sexo {
  MASCULINO = 'MASCULINO',
  FEMENINO = 'FEMENINO',
  OTRO = 'OTRO',
}

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
}

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  tenantSlug?: string;
  tenantSchema?: string;
  sessionId: string;
}

export interface TenantSettings {
  timezone: string;
  currency: string;
  language: string;
}

export interface MedicoHorario {
  [dia: string]: string[];
}

export const CITA_ESTADO_VALUES = Object.values(CitaEstado);
export const SEXO_VALUES = Object.values(Sexo);
export const USER_ROLE_VALUES = Object.values(UserRole);