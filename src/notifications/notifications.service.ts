import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTypeDto } from './dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async listNotifications(userId: string, unreadOnly: boolean = false) {
    const where = { userId, ...(unreadOnly && { isRead: false }) };
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    const updatedNotification = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    // Emit WebSocket event
    this.notificationsGateway.emitNotificationRead(userId, id);

    // Update unread count
    const unreadCount = await this.getUnreadCount(userId);
    this.notificationsGateway.emitUnreadCountUpdate(userId, unreadCount.count);

    return updatedNotification;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Update unread count
    this.notificationsGateway.emitUnreadCountUpdate(userId, 0);

    return { updated: true };
  }

  async deleteNotification(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.prisma.notification.delete({ where: { id } });
    return { deleted: true };
  }

  async createNotification(
    userId: string,
    type: NotificationTypeDto,
    title: string,
    message: string,
    entityId?: string,
  ) {
    console.log('Creating notification:', { userId, type, title, message, entityId });
    
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityId,
        isRead: false,
      },
    });

    console.log('Notification created in DB:', notification.id);

    // Emit WebSocket event to the user
    this.notificationsGateway.emitNewNotification(userId, notification);
    console.log('WebSocket event emitted to user:', userId);

    // Update unread count
    const unreadCount = await this.getUnreadCount(userId);
    this.notificationsGateway.emitUnreadCountUpdate(userId, unreadCount.count);
    console.log('Unread count updated:', unreadCount.count);

    return notification;
  }

  async notifyTaskAssignment(
    userId: string,
    taskTitle: string,
    assignedBy: string,
    taskId: string,
  ) {
    return this.createNotification(
      userId,
      'TASK_ASSIGNED' as NotificationTypeDto,
      'Task Assigned',
      `${assignedBy} assigned you: ${taskTitle}`,
      taskId,
    );
  }

  async notifyTaskUpdate(
    userId: string,
    taskTitle: string,
    updatedBy: string,
    taskId: string,
  ) {
    return this.createNotification(
      userId,
      'TASK_UPDATED' as NotificationTypeDto,
      'Task Updated',
      `${updatedBy} updated: ${taskTitle}`,
      taskId,
    );
  }

  async notifyTaskCompletion(
    userId: string,
    taskTitle: string,
    completedBy: string,
    taskId: string,
  ) {
    return this.createNotification(
      userId,
      'TASK_COMPLETED' as NotificationTypeDto,
      'Task Completed',
      `${completedBy} completed: ${taskTitle}`,
      taskId,
    );
  }

  async notifyCommentAdded(
    userId: string,
    taskTitle: string,
    commentedBy: string,
    taskId: string,
  ) {
    return this.createNotification(
      userId,
      'COMMENT_ADDED' as NotificationTypeDto,
      'New Comment',
      `${commentedBy} commented on: ${taskTitle}`,
      taskId,
    );
  }

  async notifyProjectInvite(
    userId: string,
    projectName: string,
    projectId: string,
  ) {
    return this.createNotification(
      userId,
      'PROJECT_INVITE' as NotificationTypeDto,
      'Project Invite',
      `You were invited to: ${projectName}`,
      projectId,
    );
  }

  async notifyMention(
    userId: string,
    taskTitle: string,
    mentionedBy: string,
    taskId: string,
  ) {
    return this.createNotification(
      userId,
      'MENTION' as NotificationTypeDto,
      'You were mentioned',
      `${mentionedBy} mentioned you in: ${taskTitle}`,
      taskId,
    );
  }
}
