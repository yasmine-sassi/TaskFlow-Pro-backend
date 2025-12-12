import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsInt } from 'class-validator';
import { TaskStatusDto, TaskPriorityDto } from './create-task.dto';

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
}
