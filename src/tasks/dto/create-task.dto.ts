import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsArray,
} from 'class-validator';

export enum TaskStatusDto {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

export enum TaskPriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Design login page' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Create mockups and implement responsive login UI',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskStatusDto, example: 'TODO', required: false })
  @IsOptional()
  @IsEnum(TaskStatusDto)
  status?: TaskStatusDto;

  @ApiProperty({ enum: TaskPriorityDto, example: 'HIGH', required: false })
  @IsOptional()
  @IsEnum(TaskPriorityDto)
  priority?: TaskPriorityDto;

  @ApiProperty({ example: '2025-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2025-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  position?: number;

  @ApiProperty({ example: 'project-uuid' })
  @IsString()
  projectId: string;

  @ApiProperty({
    example: ['user-uuid-1', 'user-uuid-2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeIds?: string[];

  @ApiProperty({
    example: ['label-uuid-1', 'label-uuid-2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];
}