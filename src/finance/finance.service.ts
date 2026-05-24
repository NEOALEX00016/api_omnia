import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { RecurringRecord } from './entities/recurring-record.entity';
import { CreateRecurringDto, CreateTransactionDto, UpdateRecurringDto } from './dto/finance.dto';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { AccountsService } from '../accounts/accounts.service';

type CurrencyBreakdown = {
  currencyCode: string;
  income: number;
  expense: number;
  balance: number;
};

type ExportLedgerRow = {
  date: string;
  type: string;
  amount: number;
  description: string;
  context: string;
  currencyCode: string;
  categoryName: string | null;
  accountName: string | null;
  isAuto: boolean;
};

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(RecurringRecord)
    private recurringRepo: Repository<RecurringRecord>,
    @InjectRepository(LedgerTransaction)
    private ledgerRepo: Repository<LedgerTransaction>,
    private accountsService: AccountsService,
    private dataSource: DataSource,
  ) {}

  private async ensureLedgerColumns() {
    await this.dataSource.query('ALTER TABLE omnia.ledger_transactions ADD COLUMN IF NOT EXISTS is_auto BOOLEAN DEFAULT FALSE');
  }

  private async ensureTaskDueDateColumn() {
    await this.dataSource.query(
      'ALTER TABLE omnia.tasks ADD COLUMN IF NOT EXISTS due_date DATE',
    );
  }

  private buildLedgerBaseQuery(userId: string, from?: string, to?: string) {
    const qb = this.ledgerRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.account', 'account')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.deletedAt IS NULL');

    if (from) {
      qb.andWhere('t.date >= :from', { from });
    }

    if (to) {
      qb.andWhere('t.date <= :to', { to });
    }

    return qb;
  }

  private async getExportLedgerRows(userId: string, from?: string, to?: string): Promise<ExportLedgerRow[]> {
    const rows = await this.buildLedgerBaseQuery(userId, from, to)
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .getMany();

    return rows.map((item) => ({
      date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : `${item.date}`,
      type: item.type,
      amount: Number(item.amount ?? 0),
      description: item.description ?? '',
      context: item.context ?? 'PERSONAL',
      currencyCode: item.account?.currencyCode ?? 'USD',
      categoryName: item.category?.name ?? null,
      accountName: item.account?.name ?? null,
      isAuto: Boolean(item.isAuto),
    }));
  }

  private async getCurrencyBreakdown(userId: string, from?: string, to?: string): Promise<CurrencyBreakdown[]> {
    const qb = this.ledgerRepo
      .createQueryBuilder('t')
      .leftJoin('t.account', 'account')
      .select("COALESCE(account.currency_code, 'USD')", 'currency_code')
      .addSelect("SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END)", 'income')
      .addSelect("SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END)", 'expense')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.deletedAt IS NULL');

    if (from) {
      qb.andWhere('t.date >= :from', { from });
    }

    if (to) {
      qb.andWhere('t.date <= :to', { to });
    }

    const rows = await qb
      .groupBy("COALESCE(account.currency_code, 'USD')")
      .orderBy('currency_code', 'ASC')
      .getRawMany();

    return rows.map((row: any) => {
      const income = parseFloat(row.income || '0');
      const expense = parseFloat(row.expense || '0');
      return {
        currencyCode: row.currency_code || 'USD',
        income,
        expense,
        balance: income - expense,
      };
    });
  }

  private formatCsvCell(value: unknown) {
    const text = `${value ?? ''}`.replace(/"/g, '""');
    return `"${text}"`;
  }

  async getUpcomingPayments(userId: string) {
    await this.ensureLedgerColumns();
    await this.ensureTaskDueDateColumn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const templates = await this.dataSource.query(
      `SELECT rt.id, rt.description, rt.amount, rt.type, rt.context, rt.execution_day, rt.account_id, acc.type AS account_type
       FROM omnia.recurring_templates
       rt
       LEFT JOIN omnia.accounts acc ON acc.id = rt.account_id
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND execution_day IS NOT NULL`,
      [userId],
    );

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      .toISOString()
      .split('T')[0];

    const executedThisMonth = await this.dataSource.query(
      `SELECT description, amount, type, context
       FROM omnia.ledger_transactions
       WHERE user_id = $1
         AND is_auto = TRUE
         AND deleted_at IS NULL
         AND date >= $2
         AND date < $3`,
      [userId, monthStart, nextMonthStart],
    );

    const executedKeys = new Set(
      executedThisMonth.map(
        (row: any) => `${row.description}|${Number(row.amount).toFixed(2)}|${row.type}|${row.context}`,
      ),
    );

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    const recurring = templates
      .map((t: any) => {
        const execDay = t.execution_day;
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const clampedDay = Math.min(execDay, lastDayOfMonth);

        let dueDate: Date;
        if (clampedDay >= currentDay) {
          dueDate = new Date(currentYear, currentMonth, clampedDay);
        } else {
          const nextMonth = currentMonth + 1;
          const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
          const nextMonthAdjusted = nextMonth % 12;
          const lastDayOfNext = new Date(nextYear, nextMonthAdjusted + 1, 0).getDate();
          dueDate = new Date(nextYear, nextMonthAdjusted, Math.min(execDay, lastDayOfNext));
        }

        return {
          id: t.id,
          sourceType: 'RECURRING',
          type: t.account_id && (t.account_type === 'LOAN' || t.account_type === 'CREDIT_CARD')
            ? 'EXPENSE'
            : t.type,
          description: t.description,
          amount: parseFloat(t.amount || '0'),
          dueDate: dueDate.toISOString().split('T')[0],
          context: t.context,
        };
      })
      .filter((r: any) => {
        const d = new Date(r.dueDate);
        const key = `${r.description}|${Number(r.amount).toFixed(2)}|${r.type}|${r.context}`;
        return d <= thirtyDaysLater && !executedKeys.has(key);
      })
      .map((item: any) => ({
        ...item,
        isOverdue: new Date(item.dueDate) < today,
      }))
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    await this.dataSource.query(
      "ALTER TABLE omnia.tasks ADD COLUMN IF NOT EXISTS financial_type VARCHAR(10)",
    );

    const tasks = await this.dataSource.query(
      `SELECT id, title, context, due_date, financial_value, financial_type
       FROM omnia.tasks
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND is_completed = FALSE
         AND due_date IS NOT NULL
         AND financial_value IS NOT NULL
         AND financial_value <> 0
         AND due_date <= $2`,
      [userId, thirtyDaysLater.toISOString().split('T')[0]],
    );

    const taskPayments = tasks
      .map((task: any) => {
        const amount = Math.abs(parseFloat(task.financial_value || '0'));
        if (!amount) return null;

        const dueDate = new Date(task.due_date);

        const explicitType = task.financial_type;
        const type = explicitType === 'INCOME' || explicitType === 'EXPENSE'
          ? explicitType
          : parseFloat(task.financial_value || '0') > 0
            ? 'INCOME'
            : 'EXPENSE';

        return {
          id: task.id,
          sourceType: 'TASK',
          type,
          description: task.title,
          amount,
          dueDate: dueDate.toISOString().split('T')[0],
          context: task.context,
          isOverdue: dueDate < today,
        };
      })
      .filter((item: any) => item != null);

    return [...recurring, ...taskPayments].sort(
      (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
  }

  // --- RECURRING RECORDS (Ingresos/Gastos Fijos) ---

  async createRecurring(userId: string, dto: CreateRecurringDto) {
    const record = this.recurringRepo.create({
      user_id: userId,
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      context: dto.context,
      category_id: dto.categoryId,
      project_id: dto.projectId,
      execution_day: dto.executionDay,
    });
    return this.recurringRepo.save(record);
  }

  async findAllRecurring(userId: string) {
    return this.recurringRepo.find({ 
      where: { user_id: userId } as any, 
      order: { createdAt: 'DESC' } 
    });
  }

  async deleteRecurring(id: string, userId: string) {
    const record = await this.recurringRepo.findOne({ 
      where: { id, user_id: userId } as any 
    });
    if (!record) throw new NotFoundException('Registro recurrente no encontrado');
    await this.recurringRepo.softDelete(id);
    return { message: 'Registro eliminado' };
  }

  async updateRecurring(id: string, userId: string, dto: UpdateRecurringDto) {
    const record = await this.recurringRepo.findOne({ 
      where: { id, user_id: userId } as any 
    });
    if (!record) throw new NotFoundException('Registro recurrente no encontrado');
    if (dto.amount !== undefined) record.amount = dto.amount;
    if (dto.description !== undefined) record.description = dto.description;
    if (dto.executionDay !== undefined) record.execution_day = dto.executionDay;
    return this.recurringRepo.save(record);
  }

  // --- LEDGER TRANSACTIONS (Movimientos de la Bóveda) ---

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    await this.ensureLedgerColumns();
    const transaction = this.ledgerRepo.create({
      user_id: userId,
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      context: dto.context,
      accountId: dto.accountId,
      isAuto: dto.isAuto ?? false,
      category: dto.categoryId ? ({ id: dto.categoryId } as any) : null,
      project: dto.projectId ? ({ id: dto.projectId } as any) : null,
      date: dto.date ? new Date(dto.date) : new Date(),
    });
    const saved = await this.ledgerRepo.save(transaction);

    if (dto.accountId) {
      await this.accountsService.updateBalance(dto.accountId, dto.amount, dto.type);
    }

    return saved;
  }

  async findAllLedger(userId: string, from?: string, to?: string, page = 1, limit = 50) {
    await this.ensureLedgerColumns();
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;
    const qb = this.buildLedgerBaseQuery(userId, from, to).orderBy('t.date', 'DESC');

    qb.skip((safePage - 1) * safeLimit).take(safeLimit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: safePage * safeLimit < total,
    };
  }

  async deleteTransaction(id: string, userId: string) {
    const transaction = await this.ledgerRepo.findOne({ 
      where: { id, user_id: userId } as any 
    });
    if (!transaction) throw new NotFoundException('Transacción no encontrada');

    if (transaction.accountId) {
      const reverseType = transaction.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
      await this.accountsService.updateBalance(transaction.accountId, Number(transaction.amount), reverseType);
    }

    await this.ledgerRepo.softDelete(id);
    return { message: 'Transacción eliminada' };
  }

  // --- SUMMARY (El motor del Radar de Omnia) ---

  async getSummary(userId: string) {
  const income = await this.ledgerRepo
    .createQueryBuilder('t')
    .select('SUM(t.amount)', 'total')
    .where('t.user_id = :userId', { userId })
    .andWhere('t.type = :type', { type: 'INCOME' })
    .getRawOne();

  const expense = await this.ledgerRepo
    .createQueryBuilder('t')
    .select('SUM(t.amount)', 'total')
    .where('t.user_id = :userId', { userId })
    .andWhere('t.type = :type', { type: 'EXPENSE' })
    .getRawOne();

  const projectedIncome = await this.recurringRepo
    .createQueryBuilder('r')
    .select('SUM(r.amount)', 'total')
    .where('r.user_id = :userId', { userId })
    .andWhere('r.type = :type', { type: 'INCOME' })
    .getRawOne();

  const businessFixed = await this.recurringRepo
    .createQueryBuilder('r')
    .select('SUM(r.amount)', 'total')
    .where('r.user_id = :userId', { userId })
    .andWhere('r.type = :type', { type: 'EXPENSE' })
    .andWhere('r.context = :ctx', { ctx: 'BUSINESS' })
    .getRawOne();

  const personalFixed = await this.recurringRepo
    .createQueryBuilder('r')
    .select('SUM(r.amount)', 'total')
    .where('r.user_id = :userId', { userId })
    .andWhere('r.type = :type', { type: 'EXPENSE' })
    .andWhere('r.context = :ctx', { ctx: 'PERSONAL' })
    .getRawOne();

  const totalIncome = parseFloat(income?.total || '0');
  const totalExpense = parseFloat(expense?.total || '0');

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    projectedIncome: parseFloat(projectedIncome?.total || '0'),
    businessFixed: parseFloat(businessFixed?.total || '0'),
    personalFixed: parseFloat(personalFixed?.total || '0'),
    byCurrency: await this.getCurrencyBreakdown(userId),
  };
  }

  // --- EXPORT CSV ---

  async exportCsv(userId: string, from?: string, to?: string): Promise<string> {
    const items = await this.getExportLedgerRows(userId, from, to);

    const headers = 'Fecha,Tipo,Monto,Moneda,Descripcion,Categoria,Cuenta,Contexto,Automatico\n';
    const lines: string[] = [headers];

    const byCurrency = new Map<string, ExportLedgerRow[]>();
    for (const item of items) {
      const cur = item.currencyCode || 'USD';
      if (!byCurrency.has(cur)) byCurrency.set(cur, []);
      byCurrency.get(cur)!.push(item);
    }

    for (const [currency, curItems] of byCurrency) {
      lines.push(`"=== ${currency} ===",,,`);
      const byContext = new Map<string, ExportLedgerRow[]>();
      for (const item of curItems) {
        const ctx = item.context || 'PERSONAL';
        if (!byContext.has(ctx)) byContext.set(ctx, []);
        byContext.get(ctx)!.push(item);
      }

      for (const [context, ctxItems] of byContext) {
        lines.push(`"--- ${context} ---",,,`);
        for (const t of ctxItems) {
          lines.push(
            [
              this.formatCsvCell(t.date),
              this.formatCsvCell(t.type),
              this.formatCsvCell(Number(t.amount).toFixed(2)),
              this.formatCsvCell(t.currencyCode),
              this.formatCsvCell(t.description),
              this.formatCsvCell(t.categoryName || ''),
              this.formatCsvCell(t.accountName || ''),
              this.formatCsvCell(t.context),
              t.isAuto ? 'Si' : 'No',
            ].join(','),
          );
        }
        const ctxIncome = ctxItems.filter((i) => i.type === 'INCOME').reduce((s, i) => s + i.amount, 0);
        const ctxExpense = ctxItems.filter((i) => i.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0);
        lines.push(`"Subtotal ${context}: +${ctxIncome.toFixed(2)} / -${ctxExpense.toFixed(2)}",,,,`);
      }

      const curIncome = curItems.filter((i) => i.type === 'INCOME').reduce((s, i) => s + i.amount, 0);
      const curExpense = curItems.filter((i) => i.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0);
      const curBalance = curIncome - curExpense;
      lines.push(`"Total ${currency}: +${curIncome.toFixed(2)} / -${curExpense.toFixed(2)} / ${curBalance.toFixed(2)}",,,,`);
    }

    return lines.join('\n');
  }

  async exportPdf(userId: string, from?: string, to?: string): Promise<Buffer> {
    const items = await this.getExportLedgerRows(userId, from, to);
    const filteredCurrencies = await this.getCurrencyBreakdown(userId, from, to);
    const totalIncome = filteredCurrencies.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = filteredCurrencies.reduce((sum, item) => sum + item.expense, 0);
    const totalBalance = filteredCurrencies.reduce((sum, item) => sum + item.balance, 0);

    const byCurrency = new Map<string, ExportLedgerRow[]>();
    for (const item of items) {
      const cur = item.currencyCode || 'USD';
      if (!byCurrency.has(cur)) byCurrency.set(cur, []);
      byCurrency.get(cur)!.push(item);
    }

    return await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Omnia - Reporte Financiero', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666666').text(`Rango: ${from ?? 'Inicio'} a ${to ?? 'Hoy'}`);
      doc.text(`Generado: ${new Date().toISOString().split('T')[0]}`);
      doc.moveDown();

      doc.fillColor('#111111').fontSize(13).text('Resumen global');
      doc.fontSize(11).text(`Ingresos: ${totalIncome.toFixed(2)}`);
      doc.text(`Gastos: ${totalExpense.toFixed(2)}`);
      doc.text(`Balance: ${totalBalance.toFixed(2)}`);
      doc.moveDown();

      doc.fontSize(13).text('Balance por moneda');
      filteredCurrencies.forEach((row) => {
        doc.fontSize(10).text(`${row.currencyCode}: +${row.income.toFixed(2)} / -${row.expense.toFixed(2)} / ${row.balance.toFixed(2)}`);
      });
      doc.moveDown();

      let index = 0;
      for (const [currency, curItems] of byCurrency) {
        if (doc.y > 720) doc.addPage();
        doc.fillColor('#111111').fontSize(14).text(`Moneda: ${currency}`);
        doc.moveDown(0.3);

        const byContext = new Map<string, ExportLedgerRow[]>();
        for (const item of curItems) {
          const ctx = item.context || 'PERSONAL';
          if (!byContext.has(ctx)) byContext.set(ctx, []);
          byContext.get(ctx)!.push(item);
        }

        for (const [context, ctxItems] of byContext) {
          if (doc.y > 720) doc.addPage();
          doc.fillColor('#444444').fontSize(11).text(`Contexto: ${context}`);
          doc.moveDown(0.2);

          for (const item of ctxItems) {
            index++;
            if (doc.y > 730) doc.addPage();
            doc
              .fontSize(10)
              .fillColor('#111111')
              .text(`${index}. ${item.date} · ${item.type} · ${item.currencyCode} ${item.amount.toFixed(2)}`)
              .fontSize(9)
              .fillColor('#666666')
              .text(`${item.description} | ${item.accountName || 'Sin cuenta'} | ${item.categoryName || 'Sin categoria'} | ${item.context}`);
            doc.moveDown(0.25);
          }

          const ctxIncome = ctxItems.filter((i) => i.type === 'INCOME').reduce((s, i) => s + i.amount, 0);
          const ctxExpense = ctxItems.filter((i) => i.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0);
          doc.fillColor('#222222').fontSize(10).text(`Subtotal ${context}: +${ctxIncome.toFixed(2)} / -${ctxExpense.toFixed(2)}`);
          doc.moveDown(0.4);
        }

        const curIncome = curItems.filter((i) => i.type === 'INCOME').reduce((s, i) => s + i.amount, 0);
        const curExpense = curItems.filter((i) => i.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0);
        const curBalance = curIncome - curExpense;
        doc.fillColor('#111111').fontSize(11).text(`Total ${currency}: +${curIncome.toFixed(2)} / -${curExpense.toFixed(2)} / ${curBalance.toFixed(2)}`);
        doc.moveDown(0.6);
      }

      doc.end();
    });
  }

  // --- MONTHLY REPORTS ---

  async getMonthlyReport(userId: string, from?: string, to?: string) {
    const qb = this.ledgerRepo
      .createQueryBuilder('t')
      .select("TO_CHAR(t.date, 'YYYY-MM')", 'month')
      .addSelect("SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END)", 'income')
      .addSelect("SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END)", 'expense')
      .where('t.user_id = :userId', { userId });

    if (from) {
      qb.andWhere('t.date >= :from', { from });
    }
    if (to) {
      qb.andWhere('t.date <= :to', { to });
    }

    const rows = await qb
      .groupBy("TO_CHAR(t.date, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    const currencyRowsQb = this.ledgerRepo
      .createQueryBuilder('t')
      .leftJoin('t.account', 'account')
      .select("TO_CHAR(t.date, 'YYYY-MM')", 'month')
      .addSelect("COALESCE(account.currency_code, 'USD')", 'currency_code')
      .addSelect("SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END)", 'income')
      .addSelect("SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END)", 'expense')
      .where('t.user_id = :userId', { userId })
      .andWhere('t.deletedAt IS NULL');

    if (from) {
      currencyRowsQb.andWhere('t.date >= :from', { from });
    }
    if (to) {
      currencyRowsQb.andWhere('t.date <= :to', { to });
    }

    const currencyRows = await currencyRowsQb
      .groupBy("TO_CHAR(t.date, 'YYYY-MM')")
      .addGroupBy("COALESCE(account.currency_code, 'USD')")
      .orderBy('month', 'ASC')
      .addOrderBy('currency_code', 'ASC')
      .getRawMany();

    const currenciesByMonth = new Map<string, CurrencyBreakdown[]>();
    currencyRows.forEach((row: any) => {
      const month = row.month;
      const income = parseFloat(row.income || '0');
      const expense = parseFloat(row.expense || '0');
      const current = currenciesByMonth.get(month) || [];
      current.push({
        currencyCode: row.currency_code || 'USD',
        income,
        expense,
        balance: income - expense,
      });
      currenciesByMonth.set(month, current);
    });

    return rows.map((row) => ({
      month: row.month,
      income: parseFloat(row.income || '0'),
      expense: parseFloat(row.expense || '0'),
      balance: parseFloat(row.income || '0') - parseFloat(row.expense || '0'),
      byCurrency: currenciesByMonth.get(row.month) || [],
    }));
  }
}
