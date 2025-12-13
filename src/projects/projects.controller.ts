import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto, UpdateMemberDto } from './dto/member.dto';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  create(@Req() req: any, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my accessible projects' })
  @ApiResponse({ status: 200, description: 'Projects list' })
  findAll(@Req() req: any) {
    return this.projectsService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id' })
  @ApiResponse({ status: 200, description: 'Project details' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project (owner only)' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RoleGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete project (admin only)' })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':projectId/members')
  @ApiOperation({ summary: 'List project members' })
  listMembers(@Req() req: any, @Param('projectId') projectId: string) {
    return this.projectsService.listMembers(req.user.userId, projectId);
  }

  @Post(':projectId/members')
  @ApiOperation({ summary: 'Add project member (owner only)' })
  addMember(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: AddMemberDto) {
    return this.projectsService.addMember(req.user.userId, projectId, dto);
  }

  @Patch(':projectId/members/:memberId')
  @ApiOperation({ summary: 'Update member role (owner only)' })
  updateMember(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.projectsService.updateMember(req.user.userId, projectId, memberId, dto);
  }

  @Delete(':projectId/members/:memberId')
  @ApiOperation({ summary: 'Remove project member (owner only)' })
  removeMember(@Req() req: any, @Param('projectId') projectId: string, @Param('memberId') memberId: string) {
    return this.projectsService.removeMember(req.user.userId, projectId, memberId);
  }
}
