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

@Entity({ name: 'medicos' })
@Index(['apellidos', 'nombre'])
@Index(['especialidad'])
@Index(['colegiado'], { unique: true })
export class Medico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  dni: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellidos: string;

  @Column({ length: 80 })
  especialidad: string;

  @Column({ length: 50, unique: true })
  colegiado: string;

  @Column({ length: 20, type: 'varchar', nullable: true })
  telefono: string | null;

  @Column({ length: 100, type: 'varchar', nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  horario: Record<string, string[]>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CitaMedica, (cita) => cita.medico)
  citas: CitaMedica[];
}