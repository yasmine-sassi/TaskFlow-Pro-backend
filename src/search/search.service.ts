import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchTasksDto } from './dto/search-tasks.dto';
import { SearchCommentsDto } from './dto/search-comments.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchTasks(userId: string, dto: SearchTasksDto) {
    const accessibleProjectIds = await this.getAccessibleProjectIds(userId);
    if (accessibleProjectIds.length === 0) {
      return this.emptyResult(dto.page, dto.limit);
    }

    const projectScope = this.resolveProjectScope(accessibleProjectIds, dto.projectId);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      projectId: { in: projectScope },
    };

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ];
    }
    if (dto.status) where.status = dto.status;
    if (dto.priority) where.priority = dto.priority;
    if (dto.labelId) where.labels = { some: { id: dto.labelId } };
    if (dto.dueFrom || dto.dueTo) {
      where.dueDate = {};
      if (dto.dueFrom) where.dueDate.gte = new Date(dto.dueFrom);
      if (dto.dueTo) where.dueDate.lte = new Date(dto.dueTo);
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          assignees: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          owner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          labels: true,
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

  async searchComments(userId: string, dto: SearchCommentsDto) {
    const accessibleProjectIds = await this.getAccessibleProjectIds(userId);
    if (accessibleProjectIds.length === 0) {
      return this.emptyResult(dto.page, dto.limit);
    }

    const projectScope = this.resolveProjectScope(accessibleProjectIds, dto.projectId);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const taskWhere: Prisma.TaskWhereInput = {
      projectId: { in: projectScope },
    };

    if (dto.taskStatus) taskWhere.status = dto.taskStatus;
    if (dto.taskPriority) taskWhere.priority = dto.taskPriority;
    if (dto.labelId) taskWhere.labels = { some: { id: dto.labelId } };
    if (dto.dueFrom || dto.dueTo) {
      taskWhere.dueDate = {};
      if (dto.dueFrom) taskWhere.dueDate.gte = new Date(dto.dueFrom);
      if (dto.dueTo) taskWhere.dueDate.lte = new Date(dto.dueTo);
    }

    const where: Prisma.CommentWhereInput = {
      task: taskWhere,
    };

    if (dto.q) {
      where.content = { contains: dto.q, mode: 'insensitive' };
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          task: { select: { id: true, title: true, status: true, priority: true, dueDate: true, projectId: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: comments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private resolveProjectScope(projectIds: string[], requested?: string) {
    if (!requested) return projectIds;
    if (!projectIds.includes(requested)) {
      throw new ForbiddenException('Not authorized for this project');
    }
    return [requested];
  }

  private async getAccessibleProjectIds(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'ADMIN') {
      // Admin can see all projects
      const allProjects = await this.prisma.project.findMany({ select: { id: true } });
      return allProjects.map((p) => p.id);
    }

    const projects = await this.prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }

  private emptyResult(page?: number, limit?: number) {
    const safePage = page ?? 1;
    const safeLimit = limit ?? 20;
    return {
      data: [],
      meta: {
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
      },
    };
  }
}
