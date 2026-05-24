import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    private usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const user = await this.usersService.findById(userId);
    if (!user.is_pro) {
      const count = await this.projectRepo.count({
        where: { userId, isCompleted: false },
      });
      if (count >= 3) {
        throw new ForbiddenException('Límite de proyectos alcanzado. Actualiza a Pro.');
      }
    }
    const project = this.projectRepo.create({ ...dto, userId });
    return this.projectRepo.save(project);
  }

  async findAll(userId: string, context?: string) {
    const where: any = { userId };
    if (context) where.context = context;
    return this.projectRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id, userId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    return project;
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.findOne(id, userId);
    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async delete(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    await this.projectRepo.softDelete(id);
    return { message: 'Proyecto eliminado' };
  }

  async complete(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    project.isCompleted = true;
    return this.projectRepo.save(project);
  }

  async reopen(id: string, userId: string) {
    const project = await this.findOne(id, userId);
    project.isCompleted = false;
    return this.projectRepo.save(project);
  }

  /**
   * ACTUALIZAR EARNINGS DEL PROYECTO
   * Calcula: horas trabajadas * tarifa - gastos del proyecto
   */
  async updateEarnings(projectId: string, userId: string) {
    const project = await this.findOne(projectId, userId);
    
    try {
      // Obtener horas reales de tareas completadas
      const tasksResult = await this.projectRepo.manager.query(`
        SELECT COALESCE(SUM(actual_mins), 0)::numeric / 60.0 as hours
        FROM omnia.tasks 
        WHERE project_id = $1 
        AND is_completed = true
      `, [projectId]);

      const hours = parseFloat(tasksResult?.[0]?.hours || '0');
      
      // Obtener gastos del proyecto
      const expensesResult = await this.projectRepo.manager.query(`
        SELECT COALESCE(SUM(amount), 0)::numeric as total
        FROM omnia.ledger_transactions 
        WHERE project_id = $1 
        AND type = 'EXPENSE'
      `, [projectId]);

      const totalExpenses = parseFloat(expensesResult?.[0]?.total || '0');
      
      // Calcular earnings
      const earnings = (hours * parseFloat(String(project.rate))) - totalExpenses;
      
      project.hours = hours;
      project.earned = earnings;
      
      return this.projectRepo.save(project);
    } catch (error) {
      // Si falla la consulta de earnings, simplemente guardar el proyecto sin actualizar earnings
      console.error('Error calculating earnings:', error.message);
      return project;
    }
  }
}
