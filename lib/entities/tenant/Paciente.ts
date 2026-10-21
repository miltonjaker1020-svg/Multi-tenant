import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CitaMedica } from './CitaMedica';
import { Sexo } from '../../types';

@Entity({ name: 'pacientes' })
@Index(['apellidos', 'nombre'])
@Index(['documento'], { unique: true })
@Index(['email'])
export class Paciente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  documento: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellidos: string;

  @Column({ name: 'fecha_nacimiento', type: 'timestamptz' })
  fechaNacimiento: Date;

  @Column({ type: 'enum', enum: Sexo })
  sexo: Sexo;

  @Column({ length: 20, nullable: true })
  telefono: string | null;

  @Column({ length: 100, nullable: true, unique: true })
  email: string | null;

  @Column({ length: 200, nullable: true })
  direccion: string | null;

  @Column({ type: 'text', nullable: true })
  antecedentes: string | null;

  @Column({ type: 'text', nullable: true })
  alergias: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CitaMedica, (cita) => cita.paciente)
  citas: CitaMedica[];
}