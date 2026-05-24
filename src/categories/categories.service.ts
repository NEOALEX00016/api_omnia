import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryType } from './entities/category.entity';
import { CreateCategoryDto } from './dto/category.dto';

const DEFAULT_CATEGORIES: Array<{ name: string; type: CategoryType; colorHex: string; iconName: string }> = [
  { name: 'Desarrollo', type: 'BOTH', colorHex: '#3B82F6', iconName: 'code' },
  { name: 'Diseño', type: 'BOTH', colorHex: '#8B5CF6', iconName: 'palette' },
  { name: 'Marketing', type: 'BOTH', colorHex: '#10B981', iconName: 'campaign' },
  { name: 'Consultoría', type: 'BOTH', colorHex: '#F59E0B', iconName: 'support_agent' },
  { name: 'Operaciones', type: 'BOTH', colorHex: '#6366F1', iconName: 'settings' },
  { name: 'Otro', type: 'BOTH', colorHex: '#6B7280', iconName: 'tag' },
];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
  ) {}

  async create(userId: string, dto: CreateCategoryDto) {
    const category = this.categoryRepo.create({
      ...dto,
      user_id: userId,
      colorHex: dto.colorHex || '#6B7280',
      iconName: dto.iconName || 'tag',
    });
    return this.categoryRepo.save(category);
  }

  async findAll(userId: string, type?: string) {
    const categoryType = type as CategoryType | undefined;
    
    if (categoryType) {
      return this.categoryRepo.find({
        where: [
          { user_id: userId, type: categoryType },
          { isGlobal: true, type: categoryType },
        ],
        order: { isGlobal: 'ASC', name: 'ASC' },
      });
    }

    return this.categoryRepo.find({
      where: [
        { user_id: userId },
        { isGlobal: true },
      ],
      order: { isGlobal: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, userId: string) {
    const category = await this.categoryRepo.findOne({ 
      where: [{ id, user_id: userId }, { id, isGlobal: true }] 
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.categoryRepo.softDelete(id);
    return { message: 'Categoría eliminada' };
  }

  async seedDefaultCategories(userId: string) {
    const existing = await this.categoryRepo.find({ where: { user_id: userId } });
    if (existing.length > 0) return;

    const categories = DEFAULT_CATEGORIES.map(cat => 
      this.categoryRepo.create({ 
        ...cat, 
        user_id: userId, 
        isGlobal: false 
      })
    );
    
    await this.categoryRepo.save(categories);
  }
}