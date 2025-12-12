import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto, UpdateMemberDto } from './dto/member.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  async create(ownerId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        isArchived: dto.isArchived ?? false,
        ownerId,
        members: {
          create: [{ userId: ownerId, role: 'OWNER' }],
        },
      },
    });
    return project;
  }

  async findAll(userId: string) {
    // Projects owned or where user is member
    return this.prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not authorized to access this project');
    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Only owner can update project');

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        isArchived: dto.isArchived,
      },
    });

    // Record activity
    const changes = {};
    if (dto.name) changes['name'] = dto.name;
    if (dto.description) changes['description'] = dto.description;
    if (dto.color) changes['color'] = dto.color;
    if (dto.isArchived !== undefined) changes['isArchived'] = dto.isArchived;
    await this.activity.recordProjectUpdated(userId, id, project.name, changes).catch(() => {});

    return updated;
  }

  async remove(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Only owner can delete project');
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  async listMembers(userId: string, projectId: string) {
    await this.assertMember(userId, projectId);
    return this.prisma.projectMember.findMany({ where: { projectId } });
  }

  async addMember(userId: string, projectId: string, dto: AddMemberDto) {
    await this.assertOwner(userId, projectId);
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId: dto.userId, role: dto.role },
    });

    // Record activity
    await this.activity.recordProjectMemberAdded(userId, projectId, dto.userId, dto.role).catch(() => {});

    // Notify new member of project invite
    await this.notifications
      .notifyProjectInvite(dto.userId, project.name, projectId)
      .catch(() => {});

    return member;
  }

  async updateMember(userId: string, projectId: string, memberId: string, dto: UpdateMemberDto) {
    await this.assertOwner(userId, projectId);
    // ensure member belongs to project
    const member = await this.prisma.projectMember.findUnique({ where: { id: memberId } });
    if (!member || member.projectId !== projectId) throw new NotFoundException('Member not found');
    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
  }

  async removeMember(userId: string, projectId: string, memberId: string) {
    await this.assertOwner(userId, projectId);
    const member = await this.prisma.projectMember.findUnique({ where: { id: memberId } });
    if (!member || member.projectId !== projectId) throw new NotFoundException('Member not found');
    await this.prisma.projectMember.delete({ where: { id: memberId } });
    return { deleted: true };
  }

  private async assertMember(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not authorized for this project');
  }

  private async assertOwner(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Only owner permitted');
  }
}
