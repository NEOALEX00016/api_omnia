import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
export type TransactionType = 'INCOME' | 'EXPENSE';
@Entity('recurring_templates', { schema: 'omnia' }) // 🔥 Nombre exacto del SQL
export class RecurringRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' }) // 🔥 snake_case
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'category_id', nullable: true })
  category_id: string;

  @Column({ name: 'project_id', nullable: true })
  project_id: string;

  @Column({ name: 'account_id', nullable: true })
  account_id: string;

  @Column()
  type: 'INCOME' | 'EXPENSE';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column()
  context: 'EMPLOYMENT' | 'BUSINESS' | 'PERSONAL';

  @Column({ name: 'execution_day', nullable: true })
  execution_day: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
