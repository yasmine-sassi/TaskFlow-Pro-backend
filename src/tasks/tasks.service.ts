import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  async create(userId: string, dto: CreateTaskDto) {
    // Verify user is member of project
    await this.assertProjectMember(userId, dto.projectId);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status || 'TODO',
        priority: dto.priority || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        position: dto.position ?? 0,
        projectId: dto.projectId,
        ownerId: userId,
        ...(dto.assigneeIds && dto.assigneeIds.length > 0
          ? {
              assignees: {
                connect: dto.assigneeIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
      include: {
        assignees: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Record activity
    await this.activity.recordTaskCreated(userId, task.id, task.title, dto.projectId);

    return task;
  }

  async findAll(userId: string, projectId: string, filter: FilterTaskDto) {
    // Verify user is member of project
    await this.assertProjectMember(userId, projectId);

    const { status, priority, assigneeId, search, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = { projectId };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assignees = { some: { id: assigneeId } };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignees: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignees: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        project: true,
      },
    });

    if (!task) throw new NotFoundException('Task not found');

    // Verify user is member of project
    await this.assertProjectMember(userId, task.projectId);

    return task;
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: { project: true, owner: true } });
    if (!task) throw new NotFoundException('Task not found');

    // Verify user is member of project
    await this.assertProjectMember(userId, task.projectId);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        position: dto.position,
      },
      include: {
        assignees: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify if task marked complete
    if (dto.status === 'DONE' && task.status !== 'DONE') {
      const updaterName = `${updated.owner.firstName} ${updated.owner.lastName}`.trim();
      // Notify task owner and assignees
      await this.notifications
        .notifyTaskCompletion(task.ownerId, task.title, updaterName, id)
        .catch(() => {});
      for (const assignee of updated.assignees) {
        if (assignee.id !== task.ownerId) {
          await this.notifications
            .notifyTaskCompletion(assignee.id, task.title, updaterName, id)
            .catch(() => {});
        }
      }
    } else {
      // Notify of general update
      const updaterName = `${updated.owner.firstName} ${updated.owner.lastName}`.trim();
      await this.notifications.notifyTaskUpdate(task.ownerId, task.title, updaterName, id).catch(() => {});
      for (const assignee of updated.assignees) {
        if (assignee.id !== task.ownerId) {
          await this.notifications
            .notifyTaskUpdate(assignee.id, task.title, updaterName, id)
            .catch(() => {});
        }
      }
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    // Verify user is member of project
    await this.assertProjectMember(userId, task.projectId);

    const title = task.title;
    await this.prisma.task.delete({ where: { id } });

    // Record activity
    await this.activity.recordTaskDeleted(userId, id, title, task.projectId).catch(() => {});

    return { deleted: true };
  }

  async assignUser(userId: string, taskId: string, assigneeId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // Verify user is member of project
    await this.assertProjectMember(userId, task.projectId);

    // Verify assignee is also a member
    await this.assertProjectMember(assigneeId, task.projectId);

    const result = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        assignees: {
          connect: { id: assigneeId },
        },
      },
      include: {
        assignees: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        owner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    // Record activity
    await this.activity.recordTaskAssigned(userId, taskId, assigneeId, task.projectId, task.title).catch(() => {});
    // Notify assignee
    const assignerName = `${result.owner.firstName} ${result.owner.lastName}`.trim();
    await this.notifications.notifyTaskAssignment(assigneeId, task.title, assignerName, taskId).catch(() => {
      // Silently fail notification if it errors
    });

    return result;
  }

  async unassignUser(userId: string, taskId: string, assigneeId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // Verify user is member of project
    await this.assertProjectMember(userId, task.projectId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        assignees: {
          disconnect: { id: assigneeId },
        },
      },
      include: {
        assignees: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
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
