import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear proyecto' })
  create(@Request() req: any, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proyectos' })
  findAll(@Request() req: any, @Query('context') context?: string) {
    return this.projectsService.findAll(req.user.id, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proyecto' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar proyecto' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar proyecto' })
  delete(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.delete(id, req.user.id);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Completar proyecto' })
  complete(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.complete(id, req.user.id);
  }

  @Put(':id/reopen')
  @ApiOperation({ summary: 'Reabrir proyecto' })
  reopen(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.reopen(id, req.user.id);
  }
}