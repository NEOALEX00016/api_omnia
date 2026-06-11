import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Bank } from './bank.entity';

export type AccountType = 'CASH' | 'BANK' | 'CREDIT_CARD' | 'SAVINGS' | 'INVESTMENT' | 'LOAN';
export type LoanAmortizationMethod = 'FRENCH' | 'GERMAN' | 'AMERICAN';
export type LoanInterestPeriod = 'MONTHLY' | 'ANNUAL';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 30 })
  type: AccountType;

  @Column({ name: 'currency_code', length: 10, default: 'USD' })
  currencyCode: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'icon_name', length: 50, default: 'account_balance' })
  iconName: string;

  @Column({ name: 'color_hex', length: 7, default: '#6B7280' })
  colorHex: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'bank_id', nullable: true })
  bankId: string;

  @ManyToOne(() => Bank, (b) => b.id, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;

  @Column({ name: 'bank_name', length: 100, nullable: true })
  bankName: string;

  @Column({ name: 'account_number', length: 50, nullable: true })
  accountNumber: string;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 12, scale: 2, nullable: true })
  creditLimit: number;

  @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  interestRate: number;

  @Column({ name: 'interest_period', type: 'varchar', length: 10, nullable: true, default: 'ANNUAL' })
  interestPeriod: LoanInterestPeriod;

  @Column({ name: 'monthly_payment', type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyPayment: number;

  @Column({ name: 'initial_balance', type: 'decimal', precision: 14, scale: 2, nullable: true })
  initialBalance: number;

  @Column({ name: 'remaining_balance', type: 'decimal', precision: 14, scale: 2, nullable: true })
  remainingBalance: number;

  @Column({ name: 'loan_term_months', nullable: true })
  loanTermMonths: number;

  @Column({ name: 'amortization_method', type: 'varchar', length: 20, nullable: true, default: 'FRENCH' })
  amortizationMethod: LoanAmortizationMethod;

  @Column({ name: 'payment_day', nullable: true })
  paymentDay: number;

  @Column({ name: 'late_fee_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  lateFeeAmount: number;

  @Column({ name: 'late_fee_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  lateFeePercent: number;

  @Column({ name: 'statement_closing_day', nullable: true })
  statementClosingDay: number;

  @Column({ name: 'payment_due_day', nullable: true })
  paymentDueDay: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
