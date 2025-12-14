import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 403, description: 'Not a project member' })
  create(@Req() req: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(req.user.userId, dto);
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Get all tasks assigned to authenticated user' })
  @ApiResponse({ status: 200, description: 'List of assigned tasks' })
  getMyTasks(@Req() req: any, @Query() filter: FilterTaskDto) {
    return this.tasksService.findMyTasks(req.user.userId, filter);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List tasks in project with filters' })
  @ApiResponse({ status: 200, description: 'Tasks list with pagination' })
  findAll(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query() filter: FilterTaskDto,
  ) {
    return this.tasksService.findAll(req.user.userId, projectId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by id' })
  @ApiResponse({ status: 200, description: 'Task details' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.remove(req.user.userId, id);
  }

  @Post(':taskId/assign')
  @ApiOperation({ summary: 'Assign user to task' })
  @ApiResponse({ status: 200, description: 'User assigned' })
  assignUser(
    @Req() req: any,
    @Param('taskId') taskId: string,
    @Body() dto: AssignTaskDto,
  ) {
    return this.tasksService.assignUser(req.user.userId, taskId, dto.userId);
  }

  @Delete(':taskId/assign/:userId')
  @ApiOperation({ summary: 'Unassign user from task' })
  @ApiResponse({ status: 200, description: 'User unassigned' })
  unassignUser(
    @Req() req: any,
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.unassignUser(req.user.userId, taskId, userId);
  }
}
