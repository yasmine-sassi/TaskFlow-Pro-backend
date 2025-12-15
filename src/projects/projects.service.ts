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

  async create(adminUserId: string, dto: CreateProjectDto) {
    // Ensure admin is creating
    const admin = await this.prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can create projects');
    }

    // Validate owner exists
    const owner = await this.prisma.user.findUnique({ where: { id: dto.ownerId } });
    if (!owner) {
      throw new NotFoundException('Owner user not found');
    }

    const editorIds = dto.editors ?? [];
    const viewerIds = dto.viewers ?? [];

    const membersCreate = [
      { userId: dto.ownerId, role: 'OWNER' as const },
      ...editorIds.map((id) => ({ userId: id, role: 'EDITOR' as const })),
      ...viewerIds.map((id) => ({ userId: id, role: 'VIEWER' as const })),
    ];

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        isArchived: dto.isArchived ?? false,
        ownerId: dto.ownerId,
        members: {
          create: membersCreate,
        },
      },
    });
    return project;
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN';
    const where = isAdmin
      ? {}
      : {
          isArchived: false,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        };
    return this.prisma.project.findMany({
      where,
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const requester = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = requester?.role === 'ADMIN';
    if (project.isArchived && !isAdmin) {
      throw new ForbiddenException('Not authorized to access this project');
    }
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not authorized to access this project');
    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.assertOwner(userId, id);
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
    const changes = {} as Record<string, unknown>;
    if (dto.name) changes['name'] = dto.name;
    if (dto.description) changes['description'] = dto.description;
    if (dto.color) changes['color'] = dto.color;
    if (dto.isArchived !== undefined) changes['isArchived'] = dto.isArchived;
    await this.activity.recordProjectUpdated(userId, id, updated.name, changes).catch(() => {});

    return updated;
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  async listMembers(userId: string, projectId: string) {
    await this.assertMember(userId, projectId);
    return this.prisma.projectMember.findMany({ 
      where: { projectId },
      include: { user: true }
    });
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

  async setArchived(id: string, archived: boolean) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({
      where: { id },
      data: { isArchived: archived },
    });
  }

  async getAssignableUsers(requestUserId: string, projectId: string) {
    // Allow admin to list all users
    const requester = await this.prisma.user.findUnique({ where: { id: requestUserId } });
    if (!requester) throw new NotFoundException('Requester not found');
    if (requester.role === 'ADMIN') {
      return this.prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
      });
    }

    // Verify project exists and requester is an owner (either by ownerId or owner membership role)
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { where: { role: 'OWNER' } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === requestUserId || project.members.some((m) => m.userId === requestUserId);
    if (!isOwner) throw new ForbiddenException('Only ADMIN or project OWNER can list assignable users');

    return this.prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
    });
  }

  private async assertMember(userId: string, projectId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'ADMIN') return; // Admin bypass

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.isArchived) throw new ForbiddenException('Not authorized for this project');
    const isMember = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not authorized for this project');
  }

  private async assertOwner(userId: string, projectId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'ADMIN') return; // Admin bypass

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { where: { role: 'OWNER' } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId || project.members.some((m) => m.userId === userId);
    if (!isOwner) throw new ForbiddenException('Only owner permitted');
  }
}
