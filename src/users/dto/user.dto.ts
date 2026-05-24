import { IsString, IsOptional, IsBoolean, IsEmail, IsNumber, Min, Max, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class UpgradePlanDto {
  @ApiProperty()
  @IsBoolean()
  isPro: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  purchaseToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;
}

export class UpdateUserConfigDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  personalBudget?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  businessBudget?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  savingsGoal?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  currentEnergy?: number;

  @ApiProperty({ required: false })
  @IsString()
  @Length(2, 3)
  @IsOptional()
  countryCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @Length(3, 3)
  @IsOptional()
  baseCurrencyCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @Length(4, 20)
  @IsOptional()
  radarTheme?: string;
}
