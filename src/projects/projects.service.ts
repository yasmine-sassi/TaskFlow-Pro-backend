import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto, UpdateMemberDto } from './dto/member.dto';
import { ProjectMemberRole } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  async create(adminId: string, dto: CreateProjectDto) {
    // Build members array: one owner + editors + viewers
    const membersData: Array<{ userId: string; role: ProjectMemberRole }> = [];

    // Add owner
    membersData.push({ userId: dto.ownerId, role: ProjectMemberRole.OWNER });

    // Add editors
    if (dto.editors && dto.editors.length > 0) {
      dto.editors.forEach((editorId) => {
        if (editorId !== dto.ownerId) {
          // Don't duplicate owner
          membersData.push({ userId: editorId, role: ProjectMemberRole.EDITOR });
        }
      });
    }

    // Add viewers
    if (dto.viewers && dto.viewers.length > 0) {
      dto.viewers.forEach((viewerId) => {
        if (viewerId !== dto.ownerId && !membersData.some((m) => m.userId === viewerId)) {
          // Don't duplicate owner or editors
          membersData.push({ userId: viewerId, role: ProjectMemberRole.VIEWER });
        }
      });
    }

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        isArchived: dto.isArchived ?? false,
        ownerId: dto.ownerId,
        members: {
          createMany: {
            data: membersData.map((member) => ({
              userId: member.userId,
              role: member.role,
            })),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
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

    // Notify initial members (excluding the creator)
    const invitedUserIds = Array.from(
      new Set(membersData.map((m) => m.userId).filter((id) => id && id !== adminId)),
    );

    await Promise.all(
      invitedUserIds.map((userId) =>
        this.notifications
          .notifyProjectInvite(userId, project.name, project.id)
          .catch(() => {})
      )
    );

    // Record activity for project creation
    await this.activity
      .recordProjectCreated(adminId, project.id, project.name)
      .catch(() => {});

    return project;
  }

  async findAll(userId: string, role?: string) {
    // Admins get all projects, regular users get only accessible projects
    const normalizedRole = role ? role.toString().trim().toLowerCase() : '';
    if (normalizedRole === 'admin' || role === 'ADMIN') {
      return this.prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  role: true,
                },
              },
            },
          },
          tasks: {
            include: {
              assignees: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              labels: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
              subtasks: {
                select: {
                  id: true,
                  title: true,
                  isComplete: true,
                  position: true,
                },
              },
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
    }

    // Projects owned or where user is member
    return this.prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          include: {
            assignees: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            labels: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            subtasks: {
              select: {
                id: true,
                title: true,
                isComplete: true,
                position: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isMember =
      project.ownerId === userId ||
      project.members.some((m) => m.userId === userId);
    if (!isMember)
      throw new ForbiddenException('Not authorized to access this project');
    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto, userRole?: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    // Allow if user is owner OR if user is admin
    const isOwner = project.ownerId === userId;
    const isAdmin = await this.isAdminUser(userId, userRole);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only owner or admin can update project');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        isArchived: dto.isArchived,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
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
    const changes = {};
    if (dto.name) changes['name'] = dto.name;
    if (dto.description) changes['description'] = dto.description;
    if (dto.color) changes['color'] = dto.color;
    if (dto.isArchived !== undefined) changes['isArchived'] = dto.isArchived;
    await this.activity
      .recordProjectUpdated(userId, id, project.name, changes)
      .catch(() => {});

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
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async addMember(userId: string, projectId: string, dto: AddMemberDto, userRole?: string) {
    await this.assertOwner(userId, projectId, userRole);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId: dto.userId, role: dto.role },
    });

    // Record activity
    await this.activity
      .recordProjectMemberAdded(userId, projectId, dto.userId, dto.role)
      .catch(() => {});

    // Notify new member of project invite
    await this.notifications
      .notifyProjectInvite(dto.userId, project.name, projectId)
      .catch(() => {});

    return member;
  }

  async updateMember(
    userId: string,
    projectId: string,
    memberId: string,
    dto: UpdateMemberDto,
    userRole?: string,
  ) {
    await this.assertOwner(userId, projectId, userRole);
    // ensure member belongs to project
    const member = await this.prisma.projectMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.projectId !== projectId)
      throw new NotFoundException('Member not found');
    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
  }

  async removeMember(userId: string, projectId: string, memberId: string, userRole?: string) {
    await this.assertOwner(userId, projectId, userRole);
    const member = await this.prisma.projectMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.projectId !== projectId)
      throw new NotFoundException('Member not found');
    await this.prisma.projectMember.delete({ where: { id: memberId } });
    return { deleted: true };
  }

  private async assertMember(userId: string, projectId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'ADMIN') return; // Admin bypass

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isMember =
      project.ownerId === userId ||
      project.members.some((m) => m.userId === userId);
    if (!isMember)
      throw new ForbiddenException('Not authorized for this project');
  }

  private async assertOwner(userId: string, projectId: string, userRole?: string) {
    if (await this.isAdminUser(userId, userRole)) return;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId)
      throw new ForbiddenException('Only owner or admin permitted');
  }

  private async isAdminUser(userId: string, userRole?: string): Promise<boolean> {
    const normalizedRole = userRole ? userRole.toString().trim().toLowerCase() : '';
    if (normalizedRole === 'admin' || userRole === 'ADMIN') return true;

    if (!userId) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === 'ADMIN';
  }

  async setArchived(id: string, isArchived: boolean) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({
      where: { id },
      data: { isArchived },
    });
  }

  async getProjectAssignableUsers(userId: string, projectId: string) {
    await this.assertMember(userId, projectId);
    const projectMembers = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });
    return projectMembers;
  }

  async checkProjectNameExists(name: string, excludeId?: string) {
    const existingProject = await this.prisma.project.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return {
      statusCode: 200,
      message: 'Project name check completed',
      data: !!existingProject,
      timestamp: new Date().toISOString(),
    };
  }
}
