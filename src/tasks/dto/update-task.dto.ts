import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatusDto, TaskPriorityDto } from './create-task.dto';

export class UpdateSubtaskDto {
  @ApiProperty({ example: 'subtask-uuid', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Review code', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  isComplete?: boolean;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  position?: number;
}

export class UpdateTaskDto {
  @ApiProperty({ example: 'Refine login page design', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated requirements and flow', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskStatusDto, example: 'IN_PROGRESS', required: false })
  @IsOptional()
  @IsEnum(TaskStatusDto)
  status?: TaskStatusDto;

  @ApiProperty({ enum: TaskPriorityDto, example: 'URGENT', required: false })
  @IsOptional()
  @IsEnum(TaskPriorityDto)
  priority?: TaskPriorityDto;

  @ApiProperty({ example: '2025-12-25T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  position?: number;

  @ApiProperty({ example: ['label-uuid-1', 'label-uuid-2'], required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];

  @ApiProperty({
    example: [
      { id: 'st-uuid-1', title: 'Review code', isComplete: false, position: 0 },
      { title: 'Test changes', position: 1 },
    ],
    required: false,
    type: [UpdateSubtaskDto],
    description: 'Subtasks to create, update, or delete. Include id to update existing, omit to create new. To delete, pass id with null title.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSubtaskDto)
  subtasks?: UpdateSubtaskDto[];
}
