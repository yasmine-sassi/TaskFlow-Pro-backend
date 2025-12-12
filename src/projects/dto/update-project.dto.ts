import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @ApiProperty({ example: 'Website Revamp', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ example: 'Updated scope and timeline', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '#10B981', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
