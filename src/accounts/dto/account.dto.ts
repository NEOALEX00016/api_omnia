import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, Min } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsIn(['CASH', 'BANK', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'LOAN'])
  type: string;

  @IsString()
  @IsOptional()
  currencyCode?: string = 'USD';

  @IsNumber()
  @IsOptional()
  balance?: number = 0;

  @IsString()
  @IsOptional()
  iconName?: string = 'account_balance';

  @IsString()
  @IsOptional()
  colorHex?: string = '#6B7280';

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankId?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsNumber()
  @IsOptional()
  interestRate?: number;

  @IsString()
  @IsOptional()
  @IsIn(['MONTHLY', 'ANNUAL'])
  interestPeriod?: string;

  @IsNumber()
  @IsOptional()
  monthlyPayment?: number;

  @IsNumber()
  @IsOptional()
  initialBalance?: number;

  @IsNumber()
  @IsOptional()
  remainingBalance?: number;

  @IsNumber()
  @IsOptional()
  loanTermMonths?: number;

  @IsString()
  @IsOptional()
  @IsIn(['FRENCH', 'GERMAN', 'AMERICAN'])
  amortizationMethod?: string;

  @IsNumber()
  @IsOptional()
  paymentDay?: number;

  @IsNumber()
  @IsOptional()
  lateFeeAmount?: number;

  @IsNumber()
  @IsOptional()
  lateFeePercent?: number;

  @IsNumber()
  @IsOptional()
  statementClosingDay?: number;

  @IsNumber()
  @IsOptional()
  paymentDueDay?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  firstPaymentDate?: string;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(['CASH', 'BANK', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'LOAN'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsString()
  @IsOptional()
  iconName?: string;

  @IsString()
  @IsOptional()
  colorHex?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankId?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsNumber()
  @IsOptional()
  interestRate?: number;

  @IsString()
  @IsOptional()
  @IsIn(['MONTHLY', 'ANNUAL'])
  interestPeriod?: string;

  @IsNumber()
  @IsOptional()
  monthlyPayment?: number;

  @IsNumber()
  @IsOptional()
  remainingBalance?: number;

  @IsNumber()
  @IsOptional()
  initialBalance?: number;

  @IsNumber()
  @IsOptional()
  loanTermMonths?: number;

  @IsString()
  @IsOptional()
  @IsIn(['FRENCH', 'GERMAN', 'AMERICAN'])
  amortizationMethod?: string;

  @IsNumber()
  @IsOptional()
  paymentDay?: number;

  @IsNumber()
  @IsOptional()
  lateFeeAmount?: number;

  @IsNumber()
  @IsOptional()
  lateFeePercent?: number;

  @IsNumber()
  @IsOptional()
  statementClosingDay?: number;

  @IsNumber()
  @IsOptional()
  paymentDueDay?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  firstPaymentDate?: string;
}

export class CreateTransferDto {
  @IsString()
  fromAccountId: string;

  @IsString()
  @IsOptional()
  toAccountId?: string;

  @IsNumber()
  amount: number;

  @IsIn(['INSTANT', 'SAME_DAY', 'NORMAL'])
  @IsOptional()
  speed?: string = 'NORMAL';

  @IsString()
  @IsOptional()
  @IsIn(['OWN_OWNER', 'OTHER_OWNER'])
  ownerScope?: string = 'OWN_OWNER';

  @IsString()
  @IsOptional()
  @IsIn(['OWN_ACCOUNT', 'SAME_BANK', 'DIFFERENT_BANK', 'EXTERNAL'])
  transferCategory?: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsOptional()
  recipientBankName?: string;

  @IsString()
  @IsOptional()
  recipientAccount?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class PayLoanDto {
  @IsString()
  fromAccountId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  paymentDate?: string;
}

export class ReverseLoanPaymentDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  reversalDate?: string;
}
