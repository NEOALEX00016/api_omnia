import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';

export type ProjectContext = 'EMPLOYMENT' | 'BUSINESS' | 'PERSONAL';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Forzamos user_id en minúsculas
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20 })
  context: ProjectContext;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hours: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  earned: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  rate: number;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  // 🔥 Las columnas de tiempo corregidas para que coincidan con la DB
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}