import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectContext } from '../../projects/entities/project.entity';

export class CreateRecurringDto {
  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  @IsEnum(['INCOME', 'EXPENSE'])
  type: 'INCOME' | 'EXPENSE';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ enum: ['EMPLOYMENT', 'BUSINESS', 'PERSONAL'] })
  @IsEnum(['EMPLOYMENT', 'BUSINESS', 'PERSONAL'])
  context: ProjectContext;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  executionDay?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  accountId?: string;
}

export class UpdateRecurringDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  executionDay?: number;
}

export class CreateTransactionDto {
  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  @IsEnum(['INCOME', 'EXPENSE'])
  type: 'INCOME' | 'EXPENSE';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ enum: ['EMPLOYMENT', 'BUSINESS', 'PERSONAL'] })
  @IsEnum(['EMPLOYMENT', 'BUSINESS', 'PERSONAL'])
  context: ProjectContext;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  isAuto?: boolean;
}
