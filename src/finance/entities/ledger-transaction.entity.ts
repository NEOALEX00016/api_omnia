import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Project } from '../../projects/entities/project.entity';
import { Account } from '../../accounts/entities/account.entity';
import { ProjectContext } from '../../projects/entities/project.entity';


export type TransactionType = 'INCOME' | 'EXPENSE';
@Entity('ledger_transactions')
export class LedgerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'account_id', nullable: true })
  accountId: string;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 20 })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({ name: 'source_account_name', nullable: true })
  sourceAccountName: string;

  @Column({ name: 'payment_group_id', type: 'uuid', nullable: true })
  paymentGroupId: string;

  @Column({ name: 'reversal_of_group_id', type: 'uuid', nullable: true })
  reversalOfGroupId: string;

  @Column({ name: 'reversed_at', type: 'timestamp', nullable: true })
  reversedAt: Date;

  @Column({ type: 'varchar', length: 20 })
  context: ProjectContext;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @Column({ name: 'is_auto', default: false })
  isAuto: boolean;

 @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
