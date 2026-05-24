import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Res, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { FinanceService } from './finance.service';
import { CreateRecurringDto, UpdateRecurringDto, CreateTransactionDto } from './dto/finance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('recurring')
  @ApiOperation({ summary: 'Crear transacción recurrente' })
  createRecurring(@Request() req: any, @Body() dto: CreateRecurringDto) {
    return this.financeService.createRecurring(req.user.id, dto);
  }

  @Get('recurring')
  @ApiOperation({ summary: 'Listar transacciones recurrentes' })
  findAllRecurring(@Request() req: any) {
    return this.financeService.findAllRecurring(req.user.id);
  }

  @Put('recurring/:id')
  @ApiOperation({ summary: 'Actualizar transacción recurrente' })
  updateRecurring(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRecurringDto) {
    return this.financeService.updateRecurring(id, req.user.id, dto);
  }

  @Delete('recurring/:id')
  @ApiOperation({ summary: 'Eliminar transacción recurrente' })
  deleteRecurring(@Request() req: any, @Param('id') id: string) {
    return this.financeService.deleteRecurring(id, req.user.id);
  }

  @Post('ledger')
  @ApiOperation({ summary: 'Crear transacción' })
  createTransaction(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.financeService.createTransaction(req.user.id, dto);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Listar transacciones' })
  findAllLedger(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.findAllLedger(
      req.user.id,
      from,
      to,
      Number(page || '1'),
      Number(limit || '50'),
    );
  }

  @Delete('ledger/:id')
  @ApiOperation({ summary: 'Eliminar transacción' })
  deleteTransaction(@Request() req: any, @Param('id') id: string) {
    return this.financeService.deleteTransaction(id, req.user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Listar transacciones (alias)' })
  findAllTransactions(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.findAllLedger(
      req.user.id,
      from,
      to,
      Number(page || '1'),
      Number(limit || '50'),
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen financiero' })
  getSummary(@Request() req: any) {
    return this.financeService.getSummary(req.user.id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Reporte mensual por rango de fechas' })
  getMonthlyReport(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financeService.getMonthlyReport(req.user.id, from, to);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Exportar transacciones a CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="reporte.csv"')
  async exportCsv(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.financeService.exportCsv(req.user.id, from, to);
    return csv;
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Exportar transacciones a PDF' })
  async exportPdf(
    @Request() req: any,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const pdf = await this.financeService.exportPdf(req.user.id, from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.pdf"');
    res.send(pdf);
  }

  @Get('upcoming-payments')
  @ApiOperation({ summary: 'Próximos pagos/cobros (tareas con vencimiento + plantillas recurrentes)' })
  getUpcomingPayments(@Request() req: any) {
    return this.financeService.getUpcomingPayments(req.user.id);
  }
}
