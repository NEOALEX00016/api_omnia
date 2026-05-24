import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 3, unique: true })
  code: string;

  @Column({ length: 5, nullable: true })
  symbol: string;

  @Column({ name: 'exchange_rate_to_usd', type: 'decimal', precision: 10, scale: 6, default: 1 })
  exchangeRateToUsd: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}