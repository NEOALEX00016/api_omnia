import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_configs')
export class UserConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ name: 'personalBudget', type: 'decimal', precision: 12, scale: 2, default: 1200 })
  personalBudget: number;

  @Column({ name: 'businessBudget', type: 'decimal', precision: 12, scale: 2, default: 500 })
  businessBudget: number;

  @Column({ name: 'savingsGoal', type: 'decimal', precision: 12, scale: 2, default: 200 })
  savingsGoal: number;

  @Column({ default: 8 })
  currentEnergy: number;

  @Column({ name: 'country_code', length: 3, default: 'DO' })
  countryCode: string;

  @Column({ name: 'base_currency_code', length: 3, default: 'DOP' })
  baseCurrencyCode: string;

  @Column({ name: 'radar_theme', length: 20, default: 'NEON' })
  radarTheme: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
