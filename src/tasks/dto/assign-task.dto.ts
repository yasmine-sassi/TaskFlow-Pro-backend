import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;
}
