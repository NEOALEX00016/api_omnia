import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTransferRateDto {
  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  @IsIn(['OWN_OWNER', 'OTHER_OWNER'])
  ownerScope: string;

  @ApiProperty()
  @IsString()
  @IsIn(['INSTANT', 'SAME_DAY', 'NORMAL'])
  speed: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fromBank?: string | null;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  toBank?: string | null;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  feePercent?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  taxPercent?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  fixedFee?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAmount?: number | null;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTransferRateDto extends PartialType(CreateTransferRateDto) {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fromBank?: string | null;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  toBank?: string | null;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsIn(['INSTANT', 'SAME_DAY', 'NORMAL'])
  speed?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsIn(['OWN_OWNER', 'OTHER_OWNER'])
  ownerScope?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  feePercent?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxPercent?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fixedFee?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAmount?: number | null;

}
