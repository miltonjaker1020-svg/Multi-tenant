import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Paciente } from './Paciente';
import { Medico } from './Medico';
import { InformeIA, CitaEstado } from '../../types';

@Entity({ name: 'citas_medicas' })
@Index(['fechaHora'])
@Index(['pacienteId'])
@Index(['medicoId'])
@Index(['estado'])
@Index(['idempotencyKey'], { unique: true, where: '"idempotencyKey" IS NOT NULL' })
export class CitaMedica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'paciente_id' })
  pacienteId: string;

  @Column({ name: 'medico_id' })
  medicoId: string;

  @Column({ name: 'fecha_hora', type: 'timestamptz' })
  fechaHora: Date;

  @Column({ default: 30 })
  duracion: number;

  @Column({ length: 20, default: CitaEstado.PENDIENTE })
  estado: CitaEstado;

  @Column({ name: 'sintomas_paciente', type: 'text' })
  sintomasPaciente: string;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'idempotency_key', length: 255, nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ name: 'informe_ia', type: 'jsonb', nullable: true })
  informeIa: InformeIA | null;

  @Column({ name: 'diagnostico_doctor', type: 'text', nullable: true })
  diagnosticoDoctor: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Paciente, (paciente) => paciente.citas, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => Medico, (medico) => medico.citas, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medico_id' })
  medico: Medico;
}