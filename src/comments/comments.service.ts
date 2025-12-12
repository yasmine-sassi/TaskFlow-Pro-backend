import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  async create(userId: string, dto: CreateCommentDto) {
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId }, include: { owner: true, assignees: true } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectMember(userId, task.projectId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        taskId: dto.taskId,
        userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Record activity
    await this.activity.recordCommentAdded(userId, comment.id, dto.taskId, task.projectId).catch(() => {});

    // Notify task owner and assignees
    const commenterName = `${user.firstName} ${user.lastName}`.trim();
    if (task.ownerId !== userId) {
      await this.notifications
        .notifyCommentAdded(task.ownerId, task.title, commenterName, dto.taskId)
        .catch(() => {});
    }
    for (const assignee of task.assignees) {
      if (assignee.id !== userId && assignee.id !== task.ownerId) {
        await this.notifications
          .notifyCommentAdded(assignee.id, task.title, commenterName, dto.taskId)
          .catch(() => {});
      }
    }

    return comment;
  }

  async listByTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectMember(userId, task.projectId);

    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    const task = await this.prisma.task.findUnique({ where: { id: comment.taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectMember(userId, task.projectId);

    if (comment.userId !== userId) throw new ForbiddenException('Only author can edit');

    return this.prisma.comment.update({ where: { id }, data: { content: dto.content } });
  }

  async remove(userId: string, id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    const task = await this.prisma.task.findUnique({ where: { id: comment.taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectMember(userId, task.projectId);

    if (comment.userId !== userId) throw new ForbiddenException('Only author can delete');

    await this.prisma.comment.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertProjectMember(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { members: true } });
    if (!project) throw new NotFoundException('Project not found');
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not authorized for this project');
  }
}
