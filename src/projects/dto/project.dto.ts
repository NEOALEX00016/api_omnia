import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectContext } from '../entities/project.entity';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['EMPLOYMENT', 'BUSINESS', 'PERSONAL'] })
  @IsEnum(['EMPLOYMENT', 'BUSINESS', 'PERSONAL'])
  context: ProjectContext;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  rate?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class UpdateProjectDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: ['EMPLOYMENT', 'BUSINESS', 'PERSONAL'], required: false })
  @IsEnum(['EMPLOYMENT', 'BUSINESS', 'PERSONAL'])
  @IsOptional()
  context?: ProjectContext;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  @Min(0)
  rate?: number;

  @ApiProperty()
  @IsOptional()
  isCompleted?: boolean;
}
