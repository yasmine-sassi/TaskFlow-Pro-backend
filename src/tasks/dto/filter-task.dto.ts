import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { TaskStatusDto, TaskPriorityDto } from './create-task.dto';
import { Type } from 'class-transformer';

export class FilterTaskDto {
  @ApiProperty({ required: false, example: 'TODO' })
  @IsOptional()
  @IsEnum(TaskStatusDto)
  status?: TaskStatusDto;

  @ApiProperty({ required: false, example: 'HIGH' })
  @IsOptional()
  @IsEnum(TaskPriorityDto)
  priority?: TaskPriorityDto;

  @ApiProperty({ required: false, example: 'user-uuid' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({ required: false, example: 'design' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
