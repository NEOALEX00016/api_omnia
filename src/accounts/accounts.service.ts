import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Account } from './entities/account.entity';
import { Bank } from './entities/bank.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { TransferRate } from './entities/transfer-rate.entity';
import { Transfer } from './entities/transfer.entity';
import { LedgerTransaction } from '../finance/entities/ledger-transaction.entity';
import { CreateAccountDto, UpdateAccountDto, CreateTransferDto, PayLoanDto } from './dto/account.dto';
import { CreateBankDto, UpdateBankDto } from './dto/bank.dto';
import { CreateTransferRateDto, UpdateTransferRateDto } from './dto/transfer-rate.dto';

const BANK_SEEDS: Record<string, Array<{ name: string }>> = {
  DO: [
    { name: 'BHD León' },
    { name: 'BanReservas' },
    { name: 'Banco Popular' },
    { name: 'Scotiabank' },
    { name: 'Citi' },
    { name: 'Banco Santa Cruz' },
    { name: 'La Nacional' },
    { name: 'Banco Ademi' },
    { name: 'Banco Promerica' },
    { name: 'APAP' },
  ],
  US: [
    { name: 'Bank of America' },
    { name: 'Chase' },
    { name: 'Wells Fargo' },
    { name: 'Citibank' },
    { name: 'U.S. Bank' },
    { name: 'PNC Bank' },
    { name: 'TD Bank' },
    { name: 'Capital One' },
    { name: 'Ally Bank' },
    { name: 'Goldman Sachs' },
  ],
  MX: [
    { name: 'BBVA México' },
    { name: 'Banamex' },
    { name: 'Banorte' },
    { name: 'Santander México' },
    { name: 'HSBC México' },
    { name: 'Scotiabank México' },
    { name: 'Banco Azteca' },
    { name: 'BanBajío' },
    { name: 'Inbursa' },
    { name: 'BanRegio' },
  ],
  ES: [
    { name: 'Santander' },
    { name: 'BBVA' },
    { name: 'CaixaBank' },
    { name: 'Banco Sabadell' },
    { name: 'Bankinter' },
    { name: 'Unicaja' },
    { name: 'Kutxabank' },
    { name: 'Abanca' },
    { name: 'Ibercaja' },
    { name: 'Cajamar' },
  ],
  CO: [
    { name: 'Bancolombia' },
    { name: 'Banco de Bogotá' },
    { name: 'Davivienda' },
    { name: 'BBVA Colombia' },
    { name: 'Scotiabank Colpatria' },
    { name: 'Banco de Occidente' },
    { name: 'Banco Popular' },
    { name: 'Banco AV Villas' },
    { name: 'Banco Caja Social' },
    { name: 'Banco Agrario' },
  ],
  CA: [
    { name: 'RBC' },
    { name: 'TD Canada Trust' },
    { name: 'Scotiabank' },
    { name: 'BMO' },
    { name: 'CIBC' },
    { name: 'National Bank' },
    { name: 'Desjardins' },
    { name: 'Tangerine' },
    { name: 'Simplii Financial' },
    { name: 'Laurentian Bank' },
  ],
  GB: [
    { name: 'Barclays' },
    { name: 'HSBC UK' },
    { name: 'Lloyds' },
    { name: 'NatWest' },
    { name: 'Santander UK' },
    { name: 'Nationwide' },
    { name: 'TSB Bank' },
    { name: 'Virgin Money' },
    { name: 'Metro Bank' },
    { name: 'The Co-operative Bank' },
  ],
  FR: [
    { name: 'BNP Paribas' },
    { name: 'Société Générale' },
    { name: 'Crédit Agricole' },
    { name: 'Banque Populaire' },
    { name: "Caisse d'Épargne" },
    { name: 'Crédit Mutuel' },
    { name: 'LCL' },
    { name: 'HSBC France' },
    { name: 'La Banque Postale' },
    { name: 'Boursorama' },
  ],
  DE: [
    { name: 'Deutsche Bank' },
    { name: 'Commerzbank' },
    { name: 'Postbank' },
    { name: 'ING DiBa' },
    { name: 'N26' },
    { name: 'Sparkasse' },
    { name: 'Volksbank' },
    { name: 'KfW' },
    { name: 'DZ Bank' },
    { name: 'DKB' },
  ],
  PR: [
    { name: 'Banco Popular de Puerto Rico' },
    { name: 'FirstBank' },
    { name: 'Oriental Bank' },
    { name: 'Scotiabank PR' },
    { name: 'Santander PR' },
  ],
};

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
    await this.dataSource.query("ALTER TABLE omnia.accounts ADD COLUMN IF NOT EXISTS interest_period VARCHAR(10) DEFAULT 'ANNUAL'");
  }

  private async ensureRecurringAccountColumns() {
    await this.dataSource.query('ALTER TABLE omnia.recurring_templates ADD COLUMN IF NOT EXISTS account_id UUID');
  }

  private async ensureLedgerPaymentColumns() {
    await this.dataSource.query('ALTER TABLE omnia.ledger_transactions ADD COLUMN IF NOT EXISTS source_account_name VARCHAR(100)');
    await this.dataSource.query('ALTER TABLE omnia.ledger_transactions ADD COLUMN IF NOT EXISTS payment_group_id UUID');
    await this.dataSource.query('ALTER TABLE omnia.ledger_transactions ADD COLUMN IF NOT EXISTS reversal_of_group_id UUID');
    await this.dataSource.query('ALTER TABLE omnia.ledger_transactions ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP');
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
 
  private computeMonthlyPayment(
    initialBalance: number,
    termMonths: number,
    interestRate: number,
    method: 'FRENCH' | 'GERMAN' | 'AMERICAN',
    interestPeriod: 'MONTHLY' | 'ANNUAL' = 'ANNUAL',
  ): number {
    if (termMonths <= 0 || initialBalance <= 0 || interestRate <= 0) return 0;
    const monthlyRate = interestPeriod === 'MONTHLY'
      ? interestRate / 100
      : interestRate / 100 / 12;

    if (method === 'AMERICAN') {
      return Math.round(initialBalance * monthlyRate * 100) / 100;
    }
    if (method === 'GERMAN') {
      const fixedPrincipal = initialBalance / termMonths;
      const firstInstallment = fixedPrincipal + initialBalance * monthlyRate;
      return Math.round(firstInstallment * 100) / 100;
    }
    const installment = monthlyRate > 0
      ? initialBalance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths))
      : initialBalance / termMonths;
    return Math.round(installment * 100) / 100;
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
      interestPeriod: (dto.interestPeriod as any) || 'ANNUAL',
      monthlyPayment: dto.type === 'LOAN'
        ? this.computeMonthlyPayment(
            dto.initialBalance ?? dto.balance ?? 0,
            dto.loanTermMonths ?? 12,
            dto.interestRate ?? 0,
            (dto.amortizationMethod as any) || 'FRENCH',
            (dto.interestPeriod as any) || 'ANNUAL',
          )
        : dto.monthlyPayment,
      initialBalance: dto.initialBalance ?? dto.balance,
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
    await this.ensureLedgerPaymentColumns();
    const account = await this.findOne(id, userId);
    if (!dto.bankName && dto.bankId) {
      const bank = await this.bankRepo.findOne({ where: { id: dto.bankId } as any });
      if (bank) (dto as any).bankName = bank.name;
    }

    if (account.type === 'LOAN') {
      const hasPayments = (await this.ledgerRepo.count({
        where: { accountId: account.id, type: 'INCOME', reversedAt: IsNull(), paymentGroupId: Not(IsNull()) } as any,
      })) > 0;

      if (hasPayments && (
        dto.initialBalance !== undefined ||
        dto.loanTermMonths !== undefined ||
        dto.amortizationMethod !== undefined ||
        dto.interestPeriod !== undefined
      )) {
        throw new BadRequestException('No puedes modificar el monto, plazo, método ni tipo de interés de un préstamo con cuotas pagadas. Solo la tasa de interés.');
      }
    }

    if (dto.initialBalance !== undefined) {
      account.initialBalance = dto.initialBalance;
      account.balance = dto.initialBalance;
    }

    Object.assign(account, dto);

    if (account.type === 'LOAN') {
      account.monthlyPayment = this.computeMonthlyPayment(
        Number(account.initialBalance ?? account.remainingBalance ?? 0),
        Number(account.loanTermMonths ?? 12),
        Number(account.interestRate ?? 0),
        (account.amortizationMethod as any) || 'FRENCH',
        (account.interestPeriod as any) || 'ANNUAL',
      );
    }

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
    return this.dataSource.manager.transaction(async (manager) => {
      const accountRepo = manager.getRepository(Account);
      const ledgerRepo = manager.getRepository(LedgerTransaction);

      await this.ensureLedgerPaymentColumns();

      const loan = await accountRepo.findOne({ where: { id: loanId, user_id: userId } as any });
      if (!loan) throw new NotFoundException('Préstamo no encontrado');
      if (loan.type !== 'LOAN') throw new BadRequestException('La cuenta no es un préstamo');

      const fromAccount = await accountRepo.findOne({ where: { id: dto.fromAccountId, user_id: userId } as any });
      if (!fromAccount) throw new NotFoundException('Cuenta origen no encontrada');
      if (fromAccount.balance < dto.amount) throw new BadRequestException('Balance insuficiente');

      const remainingBefore = loan.remainingBalance ?? loan.initialBalance ?? 0;

      // Backfill initialBalance on first payment for legacy loans (needed for amortization paid status)
      if ((loan.initialBalance ?? 0) <= 0 && Number(remainingBefore) > 0) {
        loan.initialBalance = Number(remainingBefore);
      }

      const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
      const paymentGroupId = randomUUID();
      const dueDate = this.resolveLoanDueDate(loan, paymentDate);
      const isLate = dueDate ? paymentDate.getTime() > dueDate.getTime() : false;
      const installmentDue = Number(loan.monthlyPayment ?? dto.amount);
      const lateFeeBase = installmentDue > 0 ? installmentDue : dto.amount;
      const lateFeeFixed = isLate ? Number(loan.lateFeeAmount ?? 0) : 0;
      const lateFeePercent = isLate ? Number(loan.lateFeePercent ?? 0) : 0;
      const lateFee = Math.min(
        dto.amount,
        Math.max(0, lateFeeFixed + (lateFeeBase * lateFeePercent) / 100),
      );
      const monthlyRate = (loan.interestPeriod === 'MONTHLY'
        ? Number(loan.interestRate ?? 0) / 100
        : Number(loan.interestRate ?? 0) / 100 / 12);
      const interestDue = Math.max(0, Number(remainingBefore) * monthlyRate);
      const afterLateFee = Math.max(0, dto.amount - lateFee);
      const interestPaid = Math.min(interestDue, afterLateFee);
      const principalPaid = Math.min(remainingBefore, Math.max(0, afterLateFee - interestPaid));
      const maxPayable = remainingBefore + interestDue + lateFee;
      if (dto.amount > maxPayable) {
        throw new BadRequestException('El pago supera el saldo pendiente más interés y mora');
      }

      fromAccount.balance = Number(fromAccount.balance) - dto.amount;
      await accountRepo.save(fromAccount);

      loan.remainingBalance = Math.max(0, remainingBefore - principalPaid);
      loan.balance = Number(loan.balance) - principalPaid;
      await accountRepo.save(loan);

      const desc = dto.note?.trim() || `Pago de préstamo ${loan.name}`;

      const catRelation = dto.categoryId ? ({ id: dto.categoryId } as any) : null;

      if (principalPaid > 0) {
        const paymentExpense = ledgerRepo.create({
          user_id: userId,
          accountId: dto.fromAccountId,
          type: 'EXPENSE',
          amount: principalPaid,
          description: desc,
          paymentGroupId,
          context: 'PERSONAL',
          category: catRelation,
          date: paymentDate,
          isAuto: false,
        });
        await ledgerRepo.save(paymentExpense);
      }

      if (interestPaid > 0) {
        const interestExpense = ledgerRepo.create({
          user_id: userId,
          accountId: dto.fromAccountId,
          type: 'EXPENSE',
          amount: interestPaid,
          description: `${desc} - interés`,
          paymentGroupId,
          context: 'PERSONAL',
          category: catRelation,
          date: paymentDate,
          isAuto: false,
        });
        await ledgerRepo.save(interestExpense);
      }

      if (lateFee > 0) {
        const feeExpense = ledgerRepo.create({
          user_id: userId,
          accountId: dto.fromAccountId,
          type: 'EXPENSE',
          amount: lateFee,
          description: `${desc} - mora`,
          paymentGroupId,
          context: 'PERSONAL',
          category: catRelation,
          date: paymentDate,
          isAuto: false,
        });
        await ledgerRepo.save(feeExpense);
      }

      if (principalPaid > 0) {
        const incomeDesc = `${desc} · desde ${fromAccount.name}`;
        const income = ledgerRepo.create({
          user_id: userId,
          accountId: loanId,
          type: 'INCOME',
          amount: principalPaid,
          description: incomeDesc,
          sourceAccountName: fromAccount.name,
          paymentGroupId,
          context: 'PERSONAL',
          category: catRelation,
          date: paymentDate,
          isAuto: false,
        });
        await ledgerRepo.save(income);
      }

      if ((loan.remainingBalance ?? 0) <= 0) {
        await this.removeRecurringTemplateForAccount(loan.id);
      }

      return loan;
    });
  }

  async reverseLoanPayment(userId: string, loanId: string, groupId: string, dto: { reason?: string; reversalDate?: string }) {
    return this.dataSource.manager.transaction(async (manager) => {
      const accountRepo = manager.getRepository(Account);
      const ledgerRepo = manager.getRepository(LedgerTransaction);

      await this.ensureLedgerPaymentColumns();

      const loan = await accountRepo.findOne({ where: { id: loanId, user_id: userId } as any });
      if (!loan) throw new NotFoundException('Préstamo no encontrado');
      if (loan.type !== 'LOAN') throw new BadRequestException('La cuenta no es un préstamo');

      const entries = await ledgerRepo.find({
        where: { user_id: userId, paymentGroupId: groupId } as any,
        relations: ['account'],
        order: { createdAt: 'ASC' },
      });

      if (entries.length === 0) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (entries.some((entry) => entry.reversedAt)) {
        throw new BadRequestException('Ese pago ya fue anulado');
      }

      const reversalDate = dto.reversalDate ? new Date(dto.reversalDate) : new Date();
      const reason = dto.reason?.trim() || 'Anulación de pago de préstamo';
      const principalToRestore = entries
        .filter((entry) => entry.accountId === loanId && entry.type === 'INCOME')
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const sourceRestores = new Map<string, number>();

      for (const entry of entries) {
        const reverseType = entry.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
        const reverseEntry = ledgerRepo.create({
          user_id: userId,
          accountId: entry.accountId,
          type: reverseType,
          amount: Number(entry.amount),
          description: `${reason} · reversa de ${entry.description ?? 'pago'}`,
          context: entry.context,
          category: entry.category ? ({ id: (entry.category as any).id } as any) : null,
          date: reversalDate,
          isAuto: false,
          reversalOfGroupId: groupId,
        });
        await ledgerRepo.save(reverseEntry);

        if (entry.accountId && entry.accountId !== loanId) {
          const current = sourceRestores.get(entry.accountId) ?? 0;
          sourceRestores.set(entry.accountId, current + Number(entry.amount));
        }
      }

      for (const [accountId, amount] of sourceRestores.entries()) {
        const sourceAccount = await accountRepo.findOne({ where: { id: accountId, user_id: userId } as any });
        if (!sourceAccount) continue;
        sourceAccount.balance = Number(sourceAccount.balance ?? 0) + amount;
        await accountRepo.save(sourceAccount);
      }

      if (principalToRestore > 0) {
        const currentRemaining = Number(loan.remainingBalance ?? loan.initialBalance ?? 0);
        const ceiling = Number(loan.initialBalance ?? 0) > 0
          ? Number(loan.initialBalance)
          : currentRemaining + principalToRestore;
        loan.remainingBalance = Math.min(ceiling, currentRemaining + principalToRestore);
        loan.balance = Number(loan.balance ?? 0) + principalToRestore;
        await accountRepo.save(loan);
      }

      await ledgerRepo
        .createQueryBuilder()
        .update(LedgerTransaction)
        .set({ reversedAt: reversalDate })
        .where('payment_group_id = :groupId', { groupId })
        .execute();

      return loan;
    });
  }

  private resolveLoanDueDate(loan: Account, paymentDate: Date): Date | null {
    const paymentDay = loan.paymentDay;
    if (!paymentDay) return null;

    const year = paymentDate.getFullYear();
    const month = paymentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(Math.max(1, Number(paymentDay)), lastDay);

    return new Date(year, month, day, 23, 59, 59, 999);
  }

  private resolveLoanTermMonths(loan: Account): number {
    if ((loan.loanTermMonths ?? 0) > 0) {
      return Math.round(Number(loan.loanTermMonths));
    }
    return Math.max(1, Math.round(Number(loan.remainingBalance ?? loan.initialBalance ?? 0) / (Number(loan.monthlyPayment ?? 1) || 1)));
  }

  private resolveAmortizationMethod(loan: Account, method?: string) {
    return ((method || loan.amortizationMethod || 'FRENCH') as 'FRENCH' | 'GERMAN' | 'AMERICAN');
  }

  private buildAmortizationSchedule(
    initialPrincipal: number,
    remainingBalance: number,
    monthlyRate: number,
    termMonths: number,
    method: 'FRENCH' | 'GERMAN' | 'AMERICAN',
    paymentEntries: Array<{ date: Date; amount: number; description: string; paidAmount?: number; paymentGroupId?: string | null; sourceAccountName?: string | null }> = [],
    nextDueDate: string | null = null,
  ) {
    const round = (value: number) => Math.round(value * 100) / 100;
    const schedule = [];
    let balance = initialPrincipal;
    let totalInterest = 0;
    let installment = 0;

    if (termMonths <= 0 || initialPrincipal <= 0) {
      return {
        schedule: [],
        summary: {
          totalPayments: 0, totalInterest: 0, method, termMonths, installment: 0,
          initialBalance: 0, remainingBalance: 0, paidCount: 0,
        },
      };
    }

    let paidCount = 0;
    for (let paymentNumber = 1; paymentNumber <= termMonths && balance > 0.01; paymentNumber++) {
      const remainingPeriods = termMonths - paymentNumber + 1;
      const interest = balance * monthlyRate;
      let scheduledPrincipal = 0;
      let scheduledPayment = 0;

      if (method === 'FRENCH') {
        scheduledPayment = monthlyRate > 0
          ? balance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -remainingPeriods))
          : balance / remainingPeriods;
        scheduledPrincipal = scheduledPayment - interest;
      } else if (method === 'GERMAN') {
        scheduledPrincipal = balance / remainingPeriods;
        scheduledPayment = scheduledPrincipal + interest;
      } else {
        scheduledPrincipal = remainingPeriods === 1 ? balance : 0;
        scheduledPayment = scheduledPrincipal + interest;
      }

      if (scheduledPrincipal > balance || remainingPeriods === 1) {
        scheduledPrincipal = balance;
        scheduledPayment = scheduledPrincipal + interest;
      }
      if (installment === 0) installment = scheduledPayment;

      const entry = paymentEntries[paymentNumber - 1];
      const paidDate = entry
        ? (entry.date instanceof Date ? entry.date.toISOString().substring(0, 10) : String(entry.date))
        : null;
      const paidFrom = entry?.sourceAccountName ?? null;
      const paidAmount = round(entry?.paidAmount ?? entry?.amount ?? 0);
      const paidPrincipal = round(Math.min(balance, Math.max(0, entry?.amount ?? 0)));
      const isPartial = paidAmount > 0 && paidAmount + 0.01 < scheduledPayment;
      const isPaid = paidAmount > 0 && !isPartial;
      const extraPrincipal = Math.max(0, paidPrincipal - scheduledPrincipal);
      const remainingDue = Math.max(0, scheduledPayment - paidAmount);

      if (isPaid) paidCount++;

      const principalToApply = entry ? paidPrincipal : scheduledPrincipal;
      balance = Math.max(0, balance - principalToApply);
      totalInterest += interest;

      schedule.push({
        paymentNumber,
        payment: round(scheduledPayment),
        interest: round(interest),
        principal: round(scheduledPrincipal),
        balance: round(balance),
        isPaid,
        isPartial,
        paidDate,
        paidAmount,
        paidPrincipal,
        paidFrom,
        paymentGroupId: entry?.paymentGroupId ?? null,
        remainingDue: round(remainingDue),
        extraPrincipal: round(extraPrincipal),
      });
    }

    return {
      schedule,
      summary: {
        totalPayments: schedule.length,
        totalInterest: round(totalInterest),
        method,
        termMonths,
        installment: round(installment),
        initialBalance: round(initialPrincipal),
        remainingBalance: round(remainingBalance),
        paidCount,
        nextDueDate,
      },
    };
  }

  async getAmortization(userId: string, loanId: string, method?: string) {
    await this.ensureLoanColumns();
    await this.ensureLedgerPaymentColumns();
    const loan = await this.findOne(loanId, userId);
    if (loan.type !== 'LOAN') throw new BadRequestException('La cuenta no es un préstamo');

    const initialPrincipal = Number(loan.initialBalance ?? loan.remainingBalance ?? 0);
    const remaining = Number(loan.remainingBalance ?? loan.initialBalance ?? 0);
    const interestRate = Number(loan.interestRate ?? 0);
    const interestPeriod = (loan.interestPeriod as string) || 'ANNUAL';
    const monthlyRate = interestPeriod === 'MONTHLY'
      ? interestRate / 100
      : interestRate / 100 / 12;
    const termMonths = this.resolveLoanTermMonths(loan);
    const selectedMethod = this.resolveAmortizationMethod(loan, method);

    // Query payment history for this loan
    const payments = await this.ledgerRepo.find({
      where: { accountId: loanId, type: 'INCOME', reversedAt: null } as any,
      order: { date: 'ASC' },
    });
    const expensePayments = await this.ledgerRepo.find({
      where: { user_id: userId, type: 'EXPENSE' } as any,
      relations: ['account'],
      order: { date: 'ASC' },
    });
    const toDateKey = (date: Date) => date instanceof Date ? date.toISOString().substring(0, 10) : String(date);
    const paymentEntries: Array<{
      date: Date;
      amount: number;
      description: string;
      paidAmount: number;
      paymentGroupId: string | null;
      reversedAt: Date | null;
      sourceAccountName: string | null;
    }> = payments.map((p) => {
      const description = p.description ?? '';
      const fromDescription = (() => {
        const match = description.match(/desde\s+(.+)$/);
        return match ? match[1].trim() : null;
      })();
      const baseDescription = description.replace(/\s+·\s+desde\s+.+$/, '').trim();
      const paymentDate = toDateKey(p.date);
      const amount = Number(p.amount);
      const pairedExpense = expensePayments.find((e) => (
        e.accountId !== loanId &&
        toDateKey(e.date) === paymentDate &&
        Math.abs(Number(e.amount) - amount) < 0.01 &&
        ((e.description ?? '').trim() === baseDescription || (e.description ?? '').trim() === description.trim())
      ));
      const actualPaidAmount = expensePayments
        .filter((e) => {
          if (e.accountId === loanId) return false;
          if (toDateKey(e.date) !== paymentDate) return false;
          const expenseDesc = (e.description ?? '').trim();
          return expenseDesc === baseDescription || expenseDesc === `${baseDescription} - interés` || expenseDesc === `${baseDescription} - mora`;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        date: p.date,
        amount,
        description,
        paidAmount: actualPaidAmount > 0 ? actualPaidAmount : amount,
        paymentGroupId: p.paymentGroupId ?? null,
        reversedAt: p.reversedAt ?? null,
        sourceAccountName: p.sourceAccountName ?? fromDescription ?? pairedExpense?.account?.name ?? null,
      };
    });

    // Calculate next due date
    const nextDueDate = this.calculateNextDueDate(loan);

    return this.buildAmortizationSchedule(
      initialPrincipal, remaining, monthlyRate, termMonths, selectedMethod,
      paymentEntries, nextDueDate,
    );
  }

  private calculateNextDueDate(loan: Account): string | null {
    const paymentDay = loan.paymentDay ?? 0;
    if (paymentDay <= 0 || paymentDay > 28) return null;

    const now = new Date();
    const today = now.getDate();

    // Determine the next occurrence of paymentDay
    let next: Date;
    if (today < paymentDay) {
      next = new Date(now.getFullYear(), now.getMonth(), paymentDay);
    } else {
      next = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
    }

    // If loan has a creation date, ensure the due date is after the first payment
    const paidCount = this.countPaidPayments(loan);
    if (loan.createdAt && paidCount > 0) {
      const created = new Date(loan.createdAt);
      // Advance from creation date by (paidCount + 1) months
      const projected = new Date(created.getFullYear(), created.getMonth() + paidCount + 1, paymentDay);
      if (projected > next) {
        next = projected;
      }
    }

    return next.toISOString().substring(0, 10); // YYYY-MM-DD
  }

  private countPaidPayments(loan: Account): number {
    // Count how many installments would have been fully paid
    const initial = Number(loan.initialBalance ?? loan.remainingBalance ?? 0);
    const remaining = Number(loan.remainingBalance ?? loan.initialBalance ?? 0);
    const monthlyPayment = Number(loan.monthlyPayment ?? 0);
    if (monthlyPayment <= 0 || initial <= 0) return 0;
    const paid = initial - remaining;
    return Math.floor(paid / monthlyPayment);
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

  async seedBanksForCountry(countryCode: string) {
    const existing = await this.bankRepo.find({ where: { countryCode, userId: null as any } });
    if (existing.length > 0) return;

    const list = BANK_SEEDS[countryCode?.toUpperCase()] ?? BANK_SEEDS['DO'];
    const entities = list.map(b =>
      this.bankRepo.create({ ...b, countryCode, userId: null, isActive: true }),
    );
    await this.bankRepo.save(entities);
    console.log(`Seeded ${entities.length} banks for ${countryCode}`);
  }
}
