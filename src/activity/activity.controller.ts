import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListActivityDto } from './dto';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List project activity log' })
  @ApiResponse({ status: 200, description: 'Activities list with pagination' })
  listProjectActivities(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query() query: ListActivityDto,
  ) {
    return this.activityService.listProjectActivities(req.user.userId, projectId, query.page, query.limit);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'List task activity log' })
  @ApiResponse({ status: 200, description: 'Activities list with pagination' })
  listTaskActivities(
    @Req() req: any,
    @Param('taskId') taskId: string,
    @Query() query: ListActivityDto,
  ) {
    return this.activityService.listTaskActivities(req.user.userId, taskId, query.page, query.limit);
  }
}
