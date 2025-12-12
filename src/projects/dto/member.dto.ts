import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum ProjectMemberRoleDto {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export class AddMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: ProjectMemberRoleDto, example: 'EDITOR' })
  @IsEnum(ProjectMemberRoleDto)
  role: ProjectMemberRoleDto;
}

export class UpdateMemberDto {
  @ApiProperty({ enum: ProjectMemberRoleDto, example: 'VIEWER' })
  @IsEnum(ProjectMemberRoleDto)
  role: ProjectMemberRoleDto;
}
