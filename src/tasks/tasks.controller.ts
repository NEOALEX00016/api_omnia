import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, CompleteTaskDto, ReorderTasksDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear tarea' })
  create(@Request() req: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tareas' })
  findAll(
    @Request() req: any,
    @Query('context') context?: string,
    @Query('includeCompleted') includeCompleted?: string,
  ) {
    const include = includeCompleted === 'true';
    return this.tasksService.findAll(req.user.id, context, include);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tarea' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.tasksService.findOne(id, req.user.id);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reordenar tareas' })
  reorder(@Request() req: any, @Body() dto: ReorderTasksDto) {
    return this.tasksService.reorder(req.user.id, dto.taskIds);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar tarea' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tarea' })
  delete(@Request() req: any, @Param('id') id: string) {
    return this.tasksService.delete(id, req.user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Completar tarea' })
  complete(@Request() req: any, @Param('id') id: string, @Body() dto: CompleteTaskDto) {
    return this.tasksService.complete(id, req.user.id, dto);
  }

  @Post('optimize')
  @ApiOperation({ summary: 'Auto-optimizar tareas (Pro)' })
  async optimize(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user.is_pro) return { message: 'Requiere Plan Pro', requiresPro: true };
    return this.tasksService.optimize(req.user.id);
  }

  @Post(':id/subtasks')
  @ApiOperation({ summary: 'Crear subtarea' })
  createSubtask(@Request() req: any, @Param('id') id: string, @Body('title') title: string) {
    return this.tasksService.createSubtask(id, req.user.id, title);
  }

  @Put('subtasks/:subtaskId')
  @ApiOperation({ summary: 'Toggle subtarea' })
  toggleSubtask(@Request() req: any, @Param('subtaskId') subtaskId: string) {
    return this.tasksService.toggleSubtask(subtaskId, req.user.id);
  }

  @Delete('subtasks/:subtaskId')
  @ApiOperation({ summary: 'Eliminar subtarea' })
  deleteSubtask(@Request() req: any, @Param('subtaskId') subtaskId: string) {
    return this.tasksService.deleteSubtask(subtaskId, req.user.id);
  }
}
