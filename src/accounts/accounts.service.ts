import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { Bank } from './entities/bank.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { TransferRate } from './entities/transfer-rate.entity';
import { Transfer } from './entities/transfer.entity';
import { LedgerTransaction } from '../finance/entities/ledger-transaction.entity';
import { CreateAccountDto, UpdateAccountDto, CreateTransferDto, PayLoanDto } from './dto/account.dto';
import { CreateBankDto, UpdateBankDto } from './dto/bank.dto';
import { CreateTransferRateDto, UpdateTransferRateDto } from './dto/transfer-rate.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountRepo: Repository<Account>,
    @InjectRepository(ExchangeRate)
    private rateRepo: Repository<ExchangeRate>,
    @InjectRepository(TransferRate)
    private transferRateRepo: Repository<TransferRate>,
    @InjectRepository(Transfer)
    private transferRepo: Repository<Transfer>,
    @InjectRepository(Bank)
    private bankRepo: Repository<Bank>,
    @InjectRepository(LedgerTransaction)
    private ledgerRepo: Repository<LedgerTransaction>,
    private dataSource: DataSource,
  ) {}

  private async ensureTransferRateColumns() {
    await this.dataSource.query("ALTER TABLE omnia.transfer_rates ADD COLUMN IF NOT EXISTS owner_scope VARCHAR(20) DEFAULT 'OWN_OWNER'");
    await this.dataSource.query('ALTER TABLE omnia.transfer_rates ADD COLUMN IF NOT EXISTS fee_percent DECIMAL(5,3) DEFAULT 0');
  }

  private async ensureTransferColumns() {
    await this.dataSource.query("ALTER TABLE omnia.transfers ADD COLUMN IF NOT EXISTS owner_scope VARCHAR(20) DEFAULT 'OWN_OWNER'");
    await this.dataSource.query('ALTER TABLE omnia.transfers ADD COLUMN IF NOT EXISTS fee_percent DECIMAL(5,3) DEFAULT 0');
    await this.dataSource.query('ALTER TABLE omnia.transfers ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2) DEFAULT 0');
    await this.dataSource.query('ALTER TABLE omnia.transfers ADD COLUMN IF NOT EXISTS recipient_bank_name VARCHAR(100)');
  }

  private async ensureLoanColumns() {
    await this.dataSource.query('ALTER TABLE omnia.accounts ADD COLUMN IF NOT EXISTS loan_term_months INTEGER');
    await this.dataSource.query("ALTER TABLE omnia.accounts ADD COLUMN IF NOT EXISTS amortization_method VARCHAR(20) DEFAULT 'FRENCH'");
    await this.dataSource.query('ALTER TABLE omnia.accounts ADD COLUMN IF NOT EXISTS payment_day INTEGER');
    await this.dataSource.query('ALTER TABLE omnia.accounts ADD COLUMN IF NOT EXISTS late_fee_amount DECIMAL(12,2)');
    await this.dataSource.query('ALTER TABLE omnia.accounts ADD COLUMN IF NOT EXISTS late_fee_percent DECIMAL(5,2)');
    await this.dataSource.query('ALTER TABLE omnia.accounts ADD COLUMN IF NOT EXISTS statement_closing_day INTEGER');
    await this.dataSource.query('ALTER TABLE omnia.accounts ADD COLUMN IF NOT EXISTS payment_due_day INTEGER');
  }

  private async ensureRecurringAccountColumns() {
    await this.dataSource.query('ALTER TABLE omnia.recurring_templates ADD COLUMN IF NOT EXISTS account_id UUID');
  }

  private async syncRecurringTemplateForAccount(account: Account, userId: string) {
    if (account.type !== 'LOAN' && account.type !== 'CREDIT_CARD') return;
    const paymentDay = account.type === 'LOAN' ? account.paymentDay : account.paymentDueDay;
    if (!paymentDay) return;

    const monthlyAmount = account.type === 'LOAN' ? (account.monthlyPayment ?? 0) : 0;
    const description = account.type === 'LOAN'
      ? `Pago Préstamo - ${account.name}`
      : `Pago Tarjeta - ${account.name}`;

    const existing = await this.dataSource.query(
      `SELECT id FROM omnia.recurring_templates WHERE account_id = $1 AND deleted_at IS NULL`,
      [account.id],
    );

    if (existing.length > 0) {
      await this.dataSource.query(
        `UPDATE omnia.recurring_templates SET type = 'EXPENSE', amount = $1, execution_day = $2, description = $3, context = 'PERSONAL' WHERE id = $4`,
        [monthlyAmount, paymentDay, description, existing[0].id],
      );
    } else {
      await this.dataSource.query(
        `INSERT INTO omnia.recurring_templates (user_id, type, amount, description, context, execution_day, account_id) VALUES ($1, 'EXPENSE', $2, $3, 'PERSONAL', $4, $5)`,
        [userId, monthlyAmount, description, paymentDay, account.id],
      );
    }
  }

  private async removeRecurringTemplateForAccount(accountId: string) {
    await this.dataSource.query(
      `UPDATE omnia.recurring_templates SET deleted_at = NOW() WHERE account_id = $1 AND deleted_at IS NULL`,
      [accountId],
    );
  }

  async create(userId: string, dto: CreateAccountDto): Promise<Account> {
    await this.ensureLoanColumns();
    await this.ensureRecurringAccountColumns();
    let bankName = dto.bankName;
    if (!bankName && dto.bankId) {
      const bank = await this.bankRepo.findOne({ where: { id: dto.bankId } as any });
      if (bank) bankName = bank.name;
    }
    const account = this.accountRepo.create({
      user_id: userId,
      name: dto.name,
      type: dto.type as any,
      currencyCode: dto.currencyCode,
      iconName: dto.iconName,
      colorHex: dto.colorHex,
      balance: dto.initialBalance ?? dto.balance ?? 0,
      bankName,
      bankId: dto.bankId,
      accountNumber: dto.accountNumber,
      creditLimit: dto.creditLimit,
      interestRate: dto.interestRate,
      monthlyPayment: dto.monthlyPayment,
      initialBalance: dto.initialBalance,
      remainingBalance: dto.remainingBalance,
      loanTermMonths: dto.loanTermMonths,
      amortizationMethod: (dto.amortizationMethod as any) || 'FRENCH',
      paymentDay: dto.paymentDay,
      lateFeeAmount: dto.lateFeeAmount,
      lateFeePercent: dto.lateFeePercent,
      statementClosingDay: dto.statementClosingDay,
      paymentDueDay: dto.paymentDueDay,
    });
    const saved = await this.accountRepo.save(account);
    await this.syncRecurringTemplateForAccount(saved, userId);
    return saved;
  }

  async findAll(userId: string): Promise<Account[]> {
    await this.ensureLoanColumns();
    return this.accountRepo.find({
      where: { user_id: userId } as any,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Account> {
    await this.ensureLoanColumns();
    const account = await this.accountRepo.findOne({
      where: { id, user_id: userId } as any,
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return account;
  }

  async update(id: string, userId: string, dto: UpdateAccountDto): Promise<Account> {
    await this.ensureLoanColumns();
    await this.ensureRecurringAccountColumns();
    const account = await this.findOne(id, userId);
    if (!dto.bankName && dto.bankId) {
      const bank = await this.bankRepo.findOne({ where: { id: dto.bankId } as any });
      if (bank) (dto as any).bankName = bank.name;
    }

    if (dto.initialBalance !== undefined) {
      account.initialBalance = dto.initialBalance;
      account.balance = dto.initialBalance;
    }

    Object.assign(account, dto);
    const saved = await this.accountRepo.save(account);
    await this.syncRecurringTemplateForAccount(saved, userId);
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const account = await this.findOne(id, userId);
    await this.removeRecurringTemplateForAccount(account.id);
    await this.accountRepo.remove(account);
  }

  async getRates(): Promise<ExchangeRate[]> {
    return this.rateRepo.find({ order: { currencyCode: 'ASC' } });
  }

  async updateRate(currencyCode: string, rate: number): Promise<ExchangeRate> {
    if (process.env.ALLOW_RATE_UPDATES !== 'true') {
      throw new ForbiddenException('La actualización de tasas no está habilitada');
    }

    let existing = await this.rateRepo.findOne({ where: { currencyCode } });
    if (existing) {
      existing.rateToUsd = rate;
      return this.rateRepo.save(existing);
    }
    existing = this.rateRepo.create({ currencyCode, rateToUsd: rate });
    return this.rateRepo.save(existing);
  }

  async getRate(currencyCode: string): Promise<number> {
    if (currencyCode === 'USD') return 1;
    const rate = await this.rateRepo.findOne({ where: { currencyCode } });
    return rate?.rateToUsd ?? 1;
  }

  async updateBalance(accountId: string, amount: number, type: 'INCOME' | 'EXPENSE'): Promise<void> {
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) return;

    if (type === 'INCOME') {
      account.balance += amount;
    } else {
      account.balance -= amount;
      if (account.type === 'LOAN' && account.remainingBalance != null) {
        account.remainingBalance -= amount;
        if (account.remainingBalance < 0) account.remainingBalance = 0;
      }
    }
    await this.accountRepo.save(account);
  }

  async getTransferRates(): Promise<TransferRate[]> {
    await this.ensureTransferRateColumns();
    return this.transferRateRepo.find({ where: { isActive: true } as any, order: { category: 'ASC', ownerScope: 'ASC', speed: 'ASC' } });
  }

  async createTransferRate(dto: CreateTransferRateDto): Promise<TransferRate> {
    await this.ensureTransferRateColumns();
    const transferRate = this.transferRateRepo.create({
      category: dto.category as any,
      ownerScope: dto.ownerScope as any,
      speed: dto.speed as any,
      fromBank: dto.fromBank || null,
      toBank: dto.toBank || null,
      feePercent: dto.feePercent ?? 0,
      taxPercent: dto.taxPercent ?? 0,
      fixedFee: dto.fixedFee ?? 0,
      minAmount: dto.minAmount ?? 0,
      maxAmount: dto.maxAmount ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.transferRateRepo.save(transferRate);
  }

  async updateTransferRate(id: string, dto: UpdateTransferRateDto): Promise<TransferRate> {
    await this.ensureTransferRateColumns();
    const transferRate = await this.transferRateRepo.findOne({ where: { id } });
    if (!transferRate) throw new NotFoundException('Regla de transferencia no encontrada');

    if (dto.fromBank !== undefined) transferRate.fromBank = dto.fromBank || null;
    if (dto.toBank !== undefined) transferRate.toBank = dto.toBank || null;
    if (dto.speed !== undefined) transferRate.speed = dto.speed as any;
    if (dto.category !== undefined) transferRate.category = dto.category as any;
    if (dto.ownerScope !== undefined) transferRate.ownerScope = dto.ownerScope as any;
    if (dto.feePercent !== undefined) transferRate.feePercent = dto.feePercent;
    if (dto.taxPercent !== undefined) transferRate.taxPercent = dto.taxPercent;
    if (dto.fixedFee !== undefined) transferRate.fixedFee = dto.fixedFee;
    if (dto.minAmount !== undefined) transferRate.minAmount = dto.minAmount;
    if (dto.maxAmount !== undefined) transferRate.maxAmount = dto.maxAmount ?? null;
    if (dto.isActive !== undefined) transferRate.isActive = dto.isActive;

    return this.transferRateRepo.save(transferRate);
  }

  async removeTransferRate(id: string) {
    await this.ensureTransferRateColumns();
    const transferRate = await this.transferRateRepo.findOne({ where: { id } });
    if (!transferRate) throw new NotFoundException('Regla de transferencia no encontrada');
    await this.transferRateRepo.remove(transferRate);
    return { message: 'Regla eliminada' };
  }

  async getTransferRate(
    fromBank: string | null,
    toBank: string | null,
    speed: string,
    ownerScope: 'OWN_OWNER' | 'OTHER_OWNER',
  ): Promise<TransferRate | null> {
    await this.ensureTransferRateColumns();
    return this.transferRateRepo.findOne({
      where: {
        fromBank: fromBank ?? undefined,
        toBank: toBank ?? undefined,
        speed: speed as any,
        ownerScope: ownerScope as any,
        isActive: true,
      } as any,
    });
  }

  async transfer(userId: string, dto: CreateTransferDto): Promise<Transfer> {
    await this.ensureTransferColumns();
    await this.ensureTransferRateColumns();

    if (dto.amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const ownerScope = (dto.ownerScope || 'OWN_OWNER') as 'OWN_OWNER' | 'OTHER_OWNER';

    return this.dataSource.manager.transaction(async (manager) => {
      const accountRepo = manager.getRepository(Account);
      const transferRepo = manager.getRepository(Transfer);
      const ledgerRepo = manager.getRepository(LedgerTransaction);

      const fromAccount = await accountRepo.findOne({ where: { id: dto.fromAccountId, user_id: userId } as any });
      if (!fromAccount) throw new NotFoundException('Cuenta origen no encontrada');

      let toAccount: Account | null = null;
      if (dto.toAccountId) {
        toAccount = await accountRepo.findOne({ where: { id: dto.toAccountId, user_id: userId } as any });
        if (!toAccount) throw new NotFoundException('Cuenta destino no encontrada');
      }

      const transferType = (dto.transferCategory as any)
        || (toAccount == null ? 'EXTERNAL'
          : fromAccount.id === toAccount.id ? 'OWN_ACCOUNT'
          : fromAccount.bankName === toAccount.bankName ? 'SAME_BANK'
          : 'DIFFERENT_BANK');

      let rate = await this.getTransferRate(fromAccount.bankName, toAccount?.bankName ?? dto.recipientBankName ?? null, dto.speed || 'NORMAL', ownerScope);

      if (!rate) {
        rate = await this.transferRateRepo.findOne({
          where: {
            category: transferType as any,
            speed: (dto.speed || 'NORMAL') as any,
            ownerScope: ownerScope as any,
            isActive: true,
            fromBank: null,
            toBank: null,
          } as any,
        });
      }

      const feePercent = rate ? parseFloat(rate.feePercent?.toString() || '0') : 0;
      const taxPercent = rate ? parseFloat(rate.taxPercent?.toString() || '0') : 0;
      const fixedFee = rate ? parseFloat(rate.fixedFee?.toString() || '0') : 0;
      const feeAmount = (dto.amount * feePercent / 100) + fixedFee;
      const taxAmount = dto.amount * taxPercent / 100;
      const totalCharge = feeAmount + taxAmount;
      const netAmount = Math.max(0, dto.amount - totalCharge);

      if (Number(fromAccount.balance) < (dto.amount + totalCharge)) {
        throw new BadRequestException('Balance insuficiente para la transferencia (incluyendo cargos)');
      }

      const transfer = transferRepo.create({
        user_id: userId,
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId ?? null,
        amount: dto.amount,
        netAmount,
        transferType: transferType as any,
        speed: (dto.speed || 'NORMAL') as any,
        ownerScope: ownerScope as any,
        feePercent,
        feeAmount,
        taxPercent,
        taxAmount,
        recipientName: dto.recipientName,
        recipientBankName: dto.recipientBankName,
        recipientAccount: dto.recipientAccount,
        note: dto.note,
      });

      const savedTransfer = await transferRepo.save(transfer);

      fromAccount.balance = Number(fromAccount.balance) - (dto.amount + totalCharge);
      if (toAccount) {
        toAccount.balance = Number(toAccount.balance) + dto.amount;
        await accountRepo.save(toAccount);
      }
      await accountRepo.save(fromAccount);

      const destName = toAccount?.name
        ?? dto.recipientName
        ?? dto.recipientBankName
        ?? 'destino';
      const sourceName = fromAccount.name ?? 'origen';
      const desc = `Transferencia de ${sourceName} → ${destName}`;

      const charges: { amount: number; label: string }[] = [];
      if (feeAmount > 0) charges.push({ amount: feeAmount, label: `Comisión por transferencia ${sourceName} → ${destName}` });
      if (taxAmount > 0) charges.push({ amount: taxAmount, label: `Impuesto por transferencia ${sourceName} → ${destName}` });

      const ledgerDebit = ledgerRepo.create({
        user_id: userId,
        accountId: dto.fromAccountId,
        type: 'EXPENSE',
        amount: dto.amount,
        description: desc,
        context: 'PERSONAL',
        date: new Date(),
        isAuto: false,
      });
      await ledgerRepo.save(ledgerDebit);

      for (const charge of charges) {
        const entry = ledgerRepo.create({
          user_id: userId,
          accountId: dto.fromAccountId,
          type: 'EXPENSE',
          amount: charge.amount,
          description: charge.label,
          context: 'PERSONAL',
          date: new Date(),
          isAuto: false,
        });
        await ledgerRepo.save(entry);
      }

      if (toAccount) {
        const ledgerCredit = ledgerRepo.create({
          user_id: userId,
          accountId: dto.toAccountId,
          type: 'INCOME',
          amount: dto.amount,
          description: desc,
          context: 'PERSONAL',
          date: new Date(),
          isAuto: false,
        });
        await ledgerRepo.save(ledgerCredit);
      }

      return savedTransfer;
    });
  }

  async getTransfers(userId: string): Promise<Transfer[]> {
    await this.ensureTransferColumns();
    return this.transferRepo.find({
      where: { user_id: userId } as any,
      relations: ['fromAccount', 'toAccount'],
      order: { createdAt: 'DESC' },
    });
  }

  async payLoan(userId: string, loanId: string, dto: PayLoanDto) {
    const loan = await this.findOne(loanId, userId);
    if (loan.type !== 'LOAN') throw new BadRequestException('La cuenta no es un préstamo');

    const fromAccount = await this.findOne(dto.fromAccountId, userId);
    if (fromAccount.balance < dto.amount) throw new BadRequestException('Balance insuficiente');

    fromAccount.balance -= dto.amount;
    await this.accountRepo.save(fromAccount);

    const remainingBefore = loan.remainingBalance ?? loan.initialBalance ?? 0;
    loan.remainingBalance = Math.max(0, remainingBefore - dto.amount);
    loan.balance -= dto.amount;
    await this.accountRepo.save(loan);

    const desc = dto.note?.trim() || `Pago de préstamo ${loan.name}`;

    const catRelation = dto.categoryId ? ({ id: dto.categoryId } as any) : null;

    const expense = this.ledgerRepo.create({
      user_id: userId,
      accountId: dto.fromAccountId,
      type: 'EXPENSE',
      amount: dto.amount,
      description: desc,
      context: 'PERSONAL',
      category: catRelation,
      date: new Date(),
      isAuto: false,
    });
    await this.ledgerRepo.save(expense);

    const income = this.ledgerRepo.create({
      user_id: userId,
      accountId: loanId,
      type: 'INCOME',
      amount: dto.amount,
      description: desc,
      context: 'PERSONAL',
      category: catRelation,
      date: new Date(),
      isAuto: false,
    });
    await this.ledgerRepo.save(income);

    if ((loan.remainingBalance ?? 0) <= 0) {
      await this.removeRecurringTemplateForAccount(loan.id);
    }

    return loan;
  }

  private resolveLoanTermMonths(loan: Account): number {
    if ((loan.loanTermMonths ?? 0) > 0) {
      return Math.round(Number(loan.loanTermMonths));
    }

    const monthlyPayment = Number(loan.monthlyPayment ?? 0);
    const principal = Number(loan.remainingBalance ?? loan.initialBalance ?? 0);

    // Backward compatibility: some existing loans stored the term in monthlyPayment.
    if (monthlyPayment > 0 && monthlyPayment <= 360 && principal > monthlyPayment * 100) {
      return Math.round(monthlyPayment);
    }

    return 12;
  }

  private resolveAmortizationMethod(loan: Account, method?: string) {
    return ((method || loan.amortizationMethod || 'FRENCH') as 'FRENCH' | 'GERMAN' | 'AMERICAN');
  }

  private buildAmortizationSchedule(
    principal: number,
    annualRate: number,
    termMonths: number,
    method: 'FRENCH' | 'GERMAN' | 'AMERICAN',
  ) {
    const monthlyRate = annualRate / 100 / 12;
    const schedule = [];
    let balance = principal;
    let totalInterest = 0;
    let installment = 0;

    if (termMonths <= 0 || principal <= 0) {
      return { schedule: [], summary: { totalPayments: 0, totalInterest: 0, method, termMonths, installment: 0 } };
    }

    if (method === 'FRENCH') {
      installment = monthlyRate > 0
        ? principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths))
        : principal / termMonths;

      for (let paymentNumber = 1; paymentNumber <= termMonths && balance > 0.01; paymentNumber++) {
        const interest = balance * monthlyRate;
        let principalPaid = installment - interest;
        if (paymentNumber == termMonths || principalPaid > balance) {
          principalPaid = balance;
        }
        const payment = principalPaid + interest;
        balance -= principalPaid;
        if (balance < 0) balance = 0;
        totalInterest += interest;
        schedule.push({
          paymentNumber,
          payment: Math.round(payment * 100) / 100,
          interest: Math.round(interest * 100) / 100,
          principal: Math.round(principalPaid * 100) / 100,
          balance: Math.round(balance * 100) / 100,
        });
      }
    }

    if (method === 'GERMAN') {
      const fixedPrincipal = principal / termMonths;
      installment = fixedPrincipal + principal * monthlyRate;

      for (let paymentNumber = 1; paymentNumber <= termMonths && balance > 0.01; paymentNumber++) {
        const interest = balance * monthlyRate;
        let principalPaid = paymentNumber === termMonths ? balance : fixedPrincipal;
        const payment = principalPaid + interest;
        balance -= principalPaid;
        if (balance < 0) balance = 0;
        totalInterest += interest;
        schedule.push({
          paymentNumber,
          payment: Math.round(payment * 100) / 100,
          interest: Math.round(interest * 100) / 100,
          principal: Math.round(principalPaid * 100) / 100,
          balance: Math.round(balance * 100) / 100,
        });
      }
    }

    if (method === 'AMERICAN') {
      installment = principal * monthlyRate;
      for (let paymentNumber = 1; paymentNumber <= termMonths; paymentNumber++) {
        const interest = balance * monthlyRate;
        const principalPaid = paymentNumber === termMonths ? balance : 0;
        const payment = principalPaid + interest;
        balance -= principalPaid;
        if (balance < 0) balance = 0;
        totalInterest += interest;
        schedule.push({
          paymentNumber,
          payment: Math.round(payment * 100) / 100,
          interest: Math.round(interest * 100) / 100,
          principal: Math.round(principalPaid * 100) / 100,
          balance: Math.round(balance * 100) / 100,
        });
      }
    }

    return {
      schedule,
      summary: {
        totalPayments: schedule.length,
        totalInterest: Math.round(totalInterest * 100) / 100,
        method,
        termMonths,
        installment: Math.round(installment * 100) / 100,
      },
    };
  }

  async getAmortization(userId: string, loanId: string, method?: string) {
    await this.ensureLoanColumns();
    const loan = await this.findOne(loanId, userId);
    if (loan.type !== 'LOAN') throw new BadRequestException('La cuenta no es un préstamo');

    const principal = Number(loan.remainingBalance ?? loan.initialBalance ?? 0);
    const annualRate = Number(loan.interestRate ?? 0);
    const termMonths = this.resolveLoanTermMonths(loan);
    const selectedMethod = this.resolveAmortizationMethod(loan, method);

    return this.buildAmortizationSchedule(principal, annualRate, termMonths, selectedMethod);
  }

  async createBank(userId: string, dto: CreateBankDto): Promise<Bank> {
    const bank = this.bankRepo.create({ ...dto, userId });
    return this.bankRepo.save(bank);
  }

  async findAllBanks(userId: string): Promise<Bank[]> {
    return this.bankRepo.find({
      where: [
        { isActive: true, userId: null } as any,
        { isActive: true, userId } as any,
      ],
      order: { name: 'ASC' },
    });
  }

  async findOneBank(id: string, userId: string): Promise<Bank> {
    const bank = await this.bankRepo.findOne({
      where: [
        { id, isActive: true, userId } as any,
        { id, isActive: true, userId: null } as any,
      ],
    });
    if (!bank) throw new NotFoundException('Banco no encontrado');
    return bank;
  }

  async updateBank(id: string, userId: string, dto: UpdateBankDto): Promise<Bank> {
    const bank = await this.bankRepo.findOne({ where: { id, isActive: true, userId } as any });
    if (!bank) throw new NotFoundException('Banco no encontrado');
    Object.assign(bank, dto);
    return this.bankRepo.save(bank);
  }

  async removeBank(id: string, userId: string): Promise<void> {
    const bank = await this.bankRepo.findOne({ where: { id, isActive: true, userId } as any });
    if (!bank) throw new NotFoundException('Banco no encontrado');
    await this.bankRepo.remove(bank);
  }
}
