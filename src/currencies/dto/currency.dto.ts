import { IsString, IsOptional, IsBoolean, MaxLength, MinLength, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'Dólar Estadounidense' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  code: string;

  @ApiPropertyOptional({ example: '$' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  symbol?: string;

  @ApiPropertyOptional({ example: 1.0 })
  @IsOptional()
  @IsNumber()
  exchangeRateToUsd?: number;
}

export class UpdateCurrencyDto {
  @ApiPropertyOptional({ example: 'Dólar Estadounidense' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: '$' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  symbol?: string;

  @ApiPropertyOptional({ example: 1.0 })
  @IsOptional()
  @IsNumber()
  exchangeRateToUsd?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}