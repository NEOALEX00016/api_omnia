import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectContext } from '../../projects/entities/project.entity';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: ['EMPLOYMENT', 'BUSINESS', 'PERSONAL'] })
  @IsEnum(['EMPLOYMENT', 'BUSINESS', 'PERSONAL'])
  context: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  project_id?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  estimatedMins?: number;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  subtasks?: { title: string }[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  urgencyScore?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  financialValue?: number;

  @ApiProperty({ required: false, enum: ['INCOME', 'EXPENSE'] })
  @IsOptional()
  @IsString()
  financialType?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  personalImportance?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  energyMatch?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  contextFatigue?: number;
}

export class UpdateTaskDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  project_id?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  urgencyScore?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  financialValue?: number;

  @ApiProperty({ required: false, enum: ['INCOME', 'EXPENSE'] })
  @IsOptional()
  @IsString()
  financialType?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  personalImportance?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  energyMatch?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  contextFatigue?: number;
}

export class CompleteTaskDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  actualDuration?: number;
}

export class ReorderTasksDto {
  @ApiProperty()
  @IsArray()
  taskIds: string[];
}
