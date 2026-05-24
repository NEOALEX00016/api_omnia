import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Subtask } from './subtask.entity';

export type TaskContext = 'EMPLOYMENT' | 'BUSINESS' | 'PERSONAL';

@Entity('tasks', { schema: 'omnia' }) // Especificamos el esquema
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string; // Coincide con el SQL

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // 🔥 ANTES DECÍA 'userId', DEBE SER 'user_id'
  user: User;

  @Column('uuid', { nullable: true })
  project_id: string; // Coincide con el SQL

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' }) // 🔥 ANTES DECÍA 'projectId', DEBE SER 'project_id'
  project: Project;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 20 })
  context: TaskContext;

  @Column({ name: 'position_index', type: 'double precision', nullable: true, default: 0 })
  positionIndex: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date;

  @Column({ name: 'estimated_mins', nullable: true, default: 30 })
  estimatedMins: number;

  @Column({ name: 'actual_mins', nullable: true, default: 0 })
  actualMins: number;

  @Column({ name: 'urgency_score', type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  urgencyScore: number;

  @Column({ name: 'financial_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  financialValue: number;

  @Column({ name: 'financial_type', type: 'varchar', length: 10, nullable: true })
  financialType: string;

  @Column({ name: 'personal_importance', default: 5 })
  personalImportance: number;

  @Column({ name: 'energy_match', default: 5 })
  energyMatch: number;

  @Column({ name: 'context_fatigue', type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  contextFatigue: number;

  @Column({ name: 'omnia_score', type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  omniaScore: number;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(() => Subtask, subtask => subtask.task, { cascade: true })
  subtasks: Subtask[];
}
