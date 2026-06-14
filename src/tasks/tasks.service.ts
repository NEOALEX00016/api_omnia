import { Injectable, OnApplicationBootstrap, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan } from 'typeorm';
import { Task, } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskDto, CompleteTaskDto, ReorderTasksDto } from './dto/task.dto';
import { ProjectsService } from '../projects/projects.service';
import { Subtask } from './entities/subtask.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class TasksService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(Subtask) private subtaskRepo: Repository<Subtask>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    private projectsService: ProjectsService,
    private dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureTaskColumns();
  }

  private async ensureTaskColumns() {
    await this.dataSource.query(
      'ALTER TABLE omnia.tasks ADD COLUMN IF NOT EXISTS due_date DATE',
    );
    await this.dataSource.query(
      "ALTER TABLE omnia.tasks ADD COLUMN IF NOT EXISTS financial_type VARCHAR(10)",
    );
  }

  /**
   * CREAR TAREA
   * - Genera position_index como DOUBLE (último + 1.0)
   * - NO recalcula tiempos aquí (el usuario define start_time)
   */
  async create(userId: string, dto: CreateTaskDto) {
    await this.ensureTaskColumns();

    if (dto.project_id) {
      const project = await this.projectRepo.findOne({ where: { id: dto.project_id, userId } });
      if (project && project.isCompleted) {
        throw new BadRequestException('No se pueden crear tareas en un proyecto completado');
      }
    }

    if (dto.startTime && dto.dueDate) {
      const conflict = await this.taskRepo.findOne({
        where: {
          user_id: userId,
          startTime: dto.startTime,
          dueDate: new Date(dto.dueDate),
          isCompleted: false,
        },
      });
      if (conflict) {
        throw new BadRequestException(
          `Ya tienes la tarea "${conflict.title}" a las ${dto.startTime} ese día`
        );
      }
    }

    const lastTask = await this.taskRepo.findOne({
      where: { user_id:userId, isCompleted: false },
      order: { positionIndex: 'DESC' },
    });

    const positionIndex = lastTask ? lastTask.positionIndex + 1.0 : 1.0;
    
    // Calcular Omnia Score
    const omniaScore = this.calculateOmniaScore(
      dto.urgencyScore || 5.0,
      dto.financialValue || 0,
      dto.personalImportance || 5,
      dto.energyMatch || 5,
      dto.contextFatigue || 5.0
    );

    const task = this.taskRepo.create({
      user_id: userId,
      positionIndex,
      title: dto.title,
      context: dto.context as any,
      project_id: dto.project_id,
      startTime: dto.startTime || '09:00',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      estimatedMins: dto.estimatedMins || dto.duration || 30,
      urgencyScore: dto.urgencyScore || 5.0,
      financialValue: dto.financialValue || 0,
      financialType: dto.financialType || null,
      personalImportance: dto.personalImportance || 5,
      energyMatch: dto.energyMatch || 5,
      contextFatigue: dto.contextFatigue || 5.0,
      omniaScore,
    });
    
    const savedTask = await this.taskRepo.save(task);

    if (dto.subtasks?.length) {
      const subtasks = dto.subtasks.map((st, i) =>
        this.subtaskRepo.create({ 
          taskId: savedTask.id, 
          title: st.title, 
          positionIndex: i * 1.0 
        }),
      );
      await this.subtaskRepo.save(subtasks);
    }
    
    return this.findOne(savedTask.id, userId);
  }

  /**
   * REORDENAR TAREAS (Drag & Drop)
   * - Actualiza position_index con DOUBLE PRECISION
   * - Llama cascada de tiempo
   */
  async reorder(userId: string, taskIds: string[]) {
    await this.ensureTaskColumns();

    for (let i = 0; i < taskIds.length; i++) {
      await this.taskRepo.update({ id: taskIds[i], user_id: userId }, { 
        positionIndex: (i + 1.0),
        updatedAt: new Date()
      });
    }
    
    // Cascada de tiempo: recalcular horarios según el nuevo orden
    await this.recalculateTimeCascade(userId);
    
    return { message: 'Tareas reordenadas', cascadeApplied: true };
  }

  /**
   * CASCADA DE TIEMPO
   * Recalcula start_time sumando duraciones sin dejar huecos
   */
  async recalculateTimeCascade(userId: string): Promise<void> {
    await this.ensureTaskColumns();

    const tasks = await this.taskRepo.find({
      where: { user_id:userId, isCompleted: false },
      order: { positionIndex: 'ASC' },
    });

    let currentMinutes = 8 * 60; // 08:00 AM

    for (const task of tasks) {
      // Convertir minutos a HH:MM
      const hours = Math.floor(currentMinutes / 60);
      const mins = currentMinutes % 60;
      const startTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      await this.taskRepo.update(task.id, { 
        startTime,
        updatedAt: new Date()
      });
      
      // Sumar duración para la siguiente tarea
      currentMinutes += task.estimatedMins;
    }
  }

  /**
   * COMPLETAR TAREA
   * - Registra tiempo real (actual_mins)
   * - Actualiza earnings del proyecto si aplica
   */
  async complete(id: string, userId: string, dto: CompleteTaskDto) {
    await this.ensureTaskColumns();

    const task = await this.findOne(id, userId);

    if (task.subtasks?.some((subtask) => !subtask.isDone)) {
      throw new BadRequestException('Completa todas las subtareas antes de cerrar la tarea');
    }

    task.isCompleted = true;
    task.completedAt = new Date();
    
    // Usar tiempo real si viene del timer (ya viene en minutos), si no usar estimado
    if (dto.actualDuration) {
      task.actualMins = Math.max(1, Math.round(dto.actualDuration));
    } else {
      task.actualMins = task.estimatedMins;
    }
    
    await this.taskRepo.save(task);

    // Actualizar proyecto si tiene
    if (task.project_id) {
      await this.projectsService.updateEarnings(task.project_id, userId);
    }

    // Re-cascada de tiempo
    await this.recalculateTimeCascade(userId);
    
    return task;
  }

  /**
   * AUTO-OPTIMIZE IA
   * Ordena por Omnia Score (mayor = primero)
   */
  async optimize(userId: string) {
    await this.ensureTaskColumns();

    const tasks = await this.findAll(userId);
    
    // Ordenar por score descendente
    tasks.sort((a, b) => (b.omniaScore || 0) - (a.omniaScore || 0));
    
    // Reasignar positions + cascade de tiempo
    const taskIds = tasks.map(t => t.id);
    return this.reorder(userId, taskIds);
  }

  /**
   * CALCULAR OMNIA SCORE (Fórmula IA)
   * Score = (Urgencia * 0.3) + (ValorFinanciero * 0.25) + (ImpPersonal * 0.2) + (MatchEnergia * 0.15) - (FatigaContexto * 0.1)
   */
  calculateOmniaScore(
    urgency: number,
    financialValue: number,
    personalImportance: number,
    energyMatch: number,
    contextFatigue: number
  ): number {
    const maxFinancial = 10000;
    
    const score = 
      (urgency * 0.30) +
      ((financialValue / maxFinancial) * 10 * 0.25) +
      (personalImportance / 10 * 10 * 0.20) +
      (energyMatch / 10 * 10 * 0.15) -
      (contextFatigue * 0.10);
    
    // Clampear entre 0 y 10
    return Math.max(0, Math.min(10, score));
  }

  // ============== CRUD BÁSICO ==============

  async findAll(userId: string, context?: string, includeCompleted = false) {
    await this.ensureTaskColumns();

    const qb = this.taskRepo.createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.subtasks', 'subtasks')
      .where('task.user_id = :userId', { userId });
    
    if (!includeCompleted) {
      qb.andWhere('task.isCompleted = :isCompleted', { isCompleted: false });
    }
    if (context) {
      qb.andWhere('task.context = :context', { context });
    }
    
    return qb.orderBy('task.positionIndex', 'ASC').getMany();
  }

  async findOne(id: string, userId: string) {
    await this.ensureTaskColumns();

    const task = await this.taskRepo.findOne({ 
      where: { id, user_id:userId }, 
      relations: ['project', 'subtasks'] 
    });
    if (!task) throw new NotFoundException('Tarea no encontrada');
    return task;
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    await this.ensureTaskColumns();

    const task = await this.findOne(id, userId);
    
    // Recalcular score si cambian parámetros
    if (dto.urgencyScore || dto.financialValue || dto.personalImportance || dto.energyMatch || dto.contextFatigue) {
      task.omniaScore = this.calculateOmniaScore(
        dto.urgencyScore ?? task.urgencyScore,
        dto.financialValue ?? task.financialValue,
        dto.personalImportance ?? task.personalImportance,
        dto.energyMatch ?? task.energyMatch,
        dto.contextFatigue ?? task.contextFatigue
      );
    }
    
    Object.assign(task, {
      ...dto,
      ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
    });
    return this.taskRepo.save(task);
  }

  async delete(id: string, userId: string) {
    await this.ensureTaskColumns();

    const task = await this.findOne(id, userId);
    await this.taskRepo.softDelete(id);
    await this.recalculateTimeCascade(userId);
    return { message: 'Tarea eliminada' };
  }

  // ============== SUBTAREAS ==============

  async createSubtask(taskId: string, userId: string, title: string) {
    await this.ensureTaskColumns();

    const task = await this.findOne(taskId, userId);
    const lastSubtask = await this.subtaskRepo.findOne({
      where: { taskId },
      order: { positionIndex: 'DESC' }
    });
    
    const subtask = this.subtaskRepo.create({
      taskId: task.id,
      title,
      positionIndex: lastSubtask ? lastSubtask.positionIndex + 1.0 : 1.0,
    });
    return this.subtaskRepo.save(subtask);
  }

  async toggleSubtask(subtaskId: string, userId: string) {
    await this.ensureTaskColumns();
    const subtask = await this.subtaskRepo.findOne({
      where: { id: subtaskId },
      relations: ['task'],
    });
    console.log(`[TasksService] toggleSubtask - subtaskId: ${subtaskId}, userId: ${userId}, found: ${!!subtask}`);
    if (!subtask) {
      throw new NotFoundException('Subtarea no encontrada');
    }
    if (!subtask.task || subtask.task.user_id !== userId) {
      throw new NotFoundException('Subtarea no encontrada');
    }
    subtask.isDone = !subtask.isDone;
    return this.subtaskRepo.save(subtask);
  }

  async deleteSubtask(subtaskId: string, userId: string) {
    await this.ensureTaskColumns();
    const subtask = await this.subtaskRepo.findOne({
      where: { id: subtaskId },
      relations: ['task'],
    });
    if (!subtask || subtask.task.user_id !== userId) {
      throw new NotFoundException('Subtarea no encontrada');
    }
    await this.subtaskRepo.remove(subtask);
    return { message: 'Subtarea eliminada' };
  }
}
