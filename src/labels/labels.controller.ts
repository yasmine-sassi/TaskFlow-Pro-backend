import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@ApiTags('labels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create label' })
  create(@Body() dto: CreateLabelDto) {
    return this.labelsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List labels' })
  findAll() {
    return this.labelsService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update label' })
  update(@Param('id') id: string, @Body() dto: UpdateLabelDto) {
    return this.labelsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete label' })
  remove(@Param('id') id: string) {
    return this.labelsService.remove(id);
  }

  @Post('attach/:taskId/:labelId')
  @ApiOperation({ summary: 'Attach label to task' })
  attach(@Req() req: any, @Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.labelsService.attachToTask(req.user.userId, taskId, labelId);
  }

  @Delete('attach/:taskId/:labelId')
  @ApiOperation({ summary: 'Detach label from task' })
  detach(@Req() req: any, @Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.labelsService.detachFromTask(req.user.userId, taskId, labelId);
  }


}
