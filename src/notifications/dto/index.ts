import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum NotificationTypeDto {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  PROJECT_INVITE = 'PROJECT_INVITE',
  MENTION = 'MENTION',
}

export class ListNotificationsDto {
  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;
}

export class MarkAsReadDto {
  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
