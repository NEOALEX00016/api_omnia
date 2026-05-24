import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { TransferRate } from './entities/transfer-rate.entity';
import { Transfer } from './entities/transfer.entity';
import { Bank } from './entities/bank.entity';
import { LedgerTransaction } from '../finance/entities/ledger-transaction.entity';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, ExchangeRate, TransferRate, Transfer, Bank, LedgerTransaction])],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}