import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Website Redesign' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Improve UX and refresh brand', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '#3B82F6', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiProperty({ example: 'user-uuid', description: 'Owner user id', required: true })
  @IsUUID()
  ownerId: string;

  @ApiProperty({ type: [String], required: false, description: 'Editors user ids' })
  @IsOptional()
  @IsArray()
  editors?: string[];

  @ApiProperty({ type: [String], required: false, description: 'Viewers user ids' })
  @IsOptional()
  @IsArray()
  viewers?: string[];
}
