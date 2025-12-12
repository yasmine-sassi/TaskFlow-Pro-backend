import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async listProjectActivities(userId: string, projectId: string, page: number = 1, limit: number = 20) {
    // Verify user is member of project
    await this.assertProjectMember(userId, projectId);

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.activity.count({ where: { projectId } }),
    ]);

    return {
      data: activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listTaskActivities(userId: string, taskId: string, page: number = 1, limit: number = 20) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // Verify user is member of task's project
    await this.assertProjectMember(userId, task.projectId);

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { taskId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.activity.count({ where: { taskId } }),
    ]);

    return {
      data: activities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async recordActivity(
    action: string,
    entity: string,
    entityId: string,
    userId?: string,
    projectId?: string,
    taskId?: string,
    metadata?: any,
  ) {
    try {
      await this.prisma.activity.create({
        data: {
          action,
          entity,
          entityId,
          userId,
          projectId,
          taskId,
          metadata,
        },
      });
    } catch (e) {
      // Silently fail activity logging to not break main operations
    }
  }

  async recordTaskCreated(userId: string, taskId: string, taskTitle: string, projectId: string) {
    await this.recordActivity('created', 'Task', taskId, userId, projectId, taskId, { title: taskTitle });
  }

  async recordTaskUpdated(userId: string, taskId: string, taskTitle: string, projectId: string, changes: any) {
    await this.recordActivity('updated', 'Task', taskId, userId, projectId, taskId, { title: taskTitle, changes });
  }

  async recordTaskDeleted(userId: string, taskId: string, taskTitle: string, projectId: string) {
    await this.recordActivity('deleted', 'Task', taskId, userId, projectId, undefined, { title: taskTitle });
  }

  async recordTaskAssigned(userId: string, taskId: string, assigneeId: string, projectId: string, taskTitle: string) {
    await this.recordActivity('assigned', 'Task', taskId, userId, projectId, taskId, {
      assigneeId,
      title: taskTitle,
    });
  }

  async recordCommentAdded(userId: string, commentId: string, taskId: string, projectId: string) {
    await this.recordActivity('added', 'Comment', commentId, userId, projectId, taskId, {});
  }

  async recordProjectCreated(userId: string, projectId: string, projectName: string) {
    await this.recordActivity('created', 'Project', projectId, userId, projectId, undefined, { name: projectName });
  }

  async recordProjectUpdated(userId: string, projectId: string, projectName: string, changes: any) {
    await this.recordActivity('updated', 'Project', projectId, userId, projectId, undefined, {
      name: projectName,
      changes,
    });
  }

  async recordProjectMemberAdded(userId: string, projectId: string, memberId: string, role: string) {
    await this.recordActivity('added_member', 'Project', projectId, userId, projectId, undefined, {
      memberId,
      role,
    });
  }

  private async assertProjectMember(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not authorized for this project');
  }
}
