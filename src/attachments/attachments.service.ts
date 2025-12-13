import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async addAttachment(userId: string, dto: CreateAttachmentDto) {
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectMember(userId, task.projectId);

    return this.prisma.attachment.create({
      data: {
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        taskId: dto.taskId,
      },
    });
  }

  async listByTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertProjectMember(userId, task.projectId);

    return this.prisma.attachment.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } });
  }

  async remove(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id }, include: { task: true } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    await this.assertProjectMember(userId, attachment.task.projectId);

    await this.prisma.attachment.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertProjectMember(userId: string, projectId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'ADMIN') return; // Admin bypass

    const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { members: true } });
    if (!project) throw new NotFoundException('Project not found');
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not authorized for this project');
  }
}
