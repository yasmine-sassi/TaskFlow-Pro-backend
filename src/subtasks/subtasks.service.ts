import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

@Injectable()
export class SubtasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubtaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectMember(userId, task.projectId);

    return this.prisma.subtask.create({
      data: {
        title: dto.title,
        isComplete: dto.isComplete ?? false,
        position: dto.position ?? 0,
        taskId: dto.taskId,
      },
    });
  }

  async listByTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectMember(userId, task.projectId);

    return this.prisma.subtask.findMany({ where: { taskId }, orderBy: { position: 'asc' } });
  }

  async update(userId: string, id: string, dto: UpdateSubtaskDto) {
    const subtask = await this.prisma.subtask.findUnique({ where: { id }, include: { task: true } });
    if (!subtask) throw new NotFoundException('Subtask not found');
    await this.assertProjectMember(userId, subtask.task.projectId);

    return this.prisma.subtask.update({
      where: { id },
      data: {
        title: dto.title,
        isComplete: dto.isComplete,
        position: dto.position,
      },
    });
  }

  async remove(userId: string, id: string) {
    const subtask = await this.prisma.subtask.findUnique({ where: { id }, include: { task: true } });
    if (!subtask) throw new NotFoundException('Subtask not found');
    await this.assertProjectMember(userId, subtask.task.projectId);

    await this.prisma.subtask.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertProjectMember(userId: string, projectId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'ADMIN') return; // Admin bypass

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not authorized for this project');
  }
}
