import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type TransferSpeed = 'INSTANT' | 'SAME_DAY' | 'NORMAL';
export type TransferCategory = 'OWN_ACCOUNT' | 'SAME_BANK' | 'DIFFERENT_BANK' | 'EXTERNAL';
export type TransferOwnerScope = 'OWN_OWNER' | 'OTHER_OWNER';

@Entity('transfer_rates')
export class TransferRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_bank', length: 100, nullable: true })
  fromBank: string | null;

  @Column({ name: 'to_bank', length: 100, nullable: true })
  toBank: string | null;

  @Column({ name: 'speed', type: 'varchar', length: 20 })
  speed: TransferSpeed;

  @Column({ name: 'category', type: 'varchar', length: 30 })
  category: TransferCategory;

  @Column({ name: 'owner_scope', type: 'varchar', length: 20, default: 'OWN_OWNER' })
  ownerScope: TransferOwnerScope;

  @Column({ name: 'fee_percent', type: 'decimal', precision: 5, scale: 3, default: 0 })
  feePercent: number;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 3, default: 0 })
  taxPercent: number;

  @Column({ name: 'fixed_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  fixedFee: number;

  @Column({ name: 'min_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minAmount: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxAmount: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
