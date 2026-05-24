import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Account } from './account.entity';

export type TransferType = 'OWN_ACCOUNT' | 'SAME_BANK' | 'DIFFERENT_BANK' | 'EXTERNAL';
export type TransferSpeed = 'INSTANT' | 'SAME_DAY' | 'NORMAL';
export type TransferOwnerScope = 'OWN_OWNER' | 'OTHER_OWNER';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'from_account_id' })
  fromAccountId: string;

  @ManyToOne(() => Account, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: Account;

  @Column({ name: 'to_account_id', nullable: true })
  toAccountId: string | null;

  @ManyToOne(() => Account, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: Account;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 12, scale: 2 })
  netAmount: number;

  @Column({ name: 'transfer_type', type: 'varchar', length: 30 })
  transferType: TransferType;

  @Column({ name: 'speed', type: 'varchar', length: 20 })
  speed: TransferSpeed;

  @Column({ name: 'owner_scope', type: 'varchar', length: 20, default: 'OWN_OWNER' })
  ownerScope: TransferOwnerScope;

  @Column({ name: 'fee_percent', type: 'decimal', precision: 5, scale: 3, default: 0 })
  feePercent: number;

  @Column({ name: 'fee_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  feeAmount: number;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 3, default: 0 })
  taxPercent: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'recipient_name', length: 100, nullable: true })
  recipientName: string;

  @Column({ name: 'recipient_bank_name', length: 100, nullable: true })
  recipientBankName: string;

  @Column({ name: 'recipient_account', length: 50, nullable: true })
  recipientAccount: string;

  @Column({ length: 200, nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
