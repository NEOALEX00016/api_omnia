import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ example: 'República Dominicana' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'DO' })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  code: string;

  @ApiPropertyOptional({ example: '🇩🇴' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  flagEmoji?: string;
}

export class UpdateCountryDto {
  @ApiPropertyOptional({ example: 'República Dominicana' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '🇩🇴' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  flagEmoji?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}