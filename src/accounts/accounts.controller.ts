import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto, CreateTransferDto, PayLoanDto } from './dto/account.dto';
import { CreateBankDto, UpdateBankDto } from './dto/bank.dto';
import { CreateTransferRateDto, UpdateTransferRateDto } from './dto/transfer-rate.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.accountsService.findAll(req.user.id);
  }

  @Get('rates')
  getRates() {
    return this.accountsService.getRates();
  }

  @Get('transfer-rates')
  getTransferRates() {
    return this.accountsService.getTransferRates();
  }

  @Post('transfer-rates')
  createTransferRate(@Body() dto: CreateTransferRateDto) {
    return this.accountsService.createTransferRate(dto);
  }

  @Put('transfer-rates/:id')
  updateTransferRate(@Param('id') id: string, @Body() dto: UpdateTransferRateDto) {
    return this.accountsService.updateTransferRate(id, dto);
  }

  @Delete('transfer-rates/:id')
  removeTransferRate(@Param('id') id: string) {
    return this.accountsService.removeTransferRate(id);
  }

  @Get('transfers')
  getTransfers(@Request() req) {
    return this.accountsService.getTransfers(req.user.id);
  }

  @Post('transfer')
  transfer(@Request() req, @Body() dto: CreateTransferDto) {
    return this.accountsService.transfer(req.user.id, dto);
  }

  @Post('loans/:id/pay')
  payLoan(@Request() req, @Param('id') id: string, @Body() dto: PayLoanDto) {
    return this.accountsService.payLoan(req.user.id, id, dto);
  }

  @Get('loans/:id/amortization')
  getAmortization(@Request() req, @Param('id') id: string, @Query('method') method?: string) {
    return this.accountsService.getAmortization(req.user.id, id, method);
  }

  @Post('banks')
  createBank(@Request() req, @Body() dto: CreateBankDto) {
    return this.accountsService.createBank(req.user.id, dto);
  }

  @Get('banks')
  findAllBanks(@Request() req) {
    return this.accountsService.findAllBanks(req.user.id);
  }

  @Get('banks/:id')
  findOneBank(@Param('id') id: string, @Request() req) {
    return this.accountsService.findOneBank(id, req.user.id);
  }

  @Put('banks/:id')
  updateBank(@Param('id') id: string, @Request() req, @Body() dto: UpdateBankDto) {
    return this.accountsService.updateBank(id, req.user.id, dto);
  }

  @Delete('banks/:id')
  removeBank(@Param('id') id: string, @Request() req) {
    return this.accountsService.removeBank(id, req.user.id);
  }

  @Put('rates/:currencyCode')
  updateRate(@Param('currencyCode') currencyCode: string, @Body('rate') rate: number) {
    return this.accountsService.updateRate(currencyCode, rate);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.accountsService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.accountsService.remove(id, req.user.id);
  }
}
