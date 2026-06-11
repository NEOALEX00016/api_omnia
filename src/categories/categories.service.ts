import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryType } from './entities/category.entity';
import { CreateCategoryDto } from './dto/category.dto';

const DEFAULT_CATEGORIES: Array<{ name: string; type: CategoryType; colorHex: string; iconName: string }> = [
  // ── INCOME ──────────────────────────────────────────
  { name: 'Salario', type: 'INCOME', colorHex: '#10B981', iconName: 'payments' },
  { name: 'Honorarios', type: 'INCOME', colorHex: '#059669', iconName: 'edit_note' },
  { name: 'Freelance', type: 'INCOME', colorHex: '#34D399', iconName: 'computer' },
  { name: 'Ventas', type: 'INCOME', colorHex: '#F59E0B', iconName: 'sell' },
  { name: 'Comisiones', type: 'INCOME', colorHex: '#D97706', iconName: 'trending_up' },
  { name: 'Bonos', type: 'INCOME', colorHex: '#14B8A6', iconName: 'card_giftcard' },
  { name: 'Consultoría', type: 'INCOME', colorHex: '#8B5CF6', iconName: 'psychology' },
  { name: 'Inversiones', type: 'INCOME', colorHex: '#6366F1', iconName: 'show_chart' },
  { name: 'Reembolsos', type: 'INCOME', colorHex: '#06B6D4', iconName: 'replay' },
  { name: 'Otros Ingresos', type: 'INCOME', colorHex: '#6B7280', iconName: 'add_circle' },

  // ── EXPENSE ─────────────────────────────────────────
  { name: 'Alquiler / Hipoteca', type: 'EXPENSE', colorHex: '#EF4444', iconName: 'home' },
  { name: 'Alimentación', type: 'EXPENSE', colorHex: '#F97316', iconName: 'restaurant' },
  { name: 'Transporte', type: 'EXPENSE', colorHex: '#EAB308', iconName: 'directions_car' },
  { name: 'Salud', type: 'EXPENSE', colorHex: '#EC4899', iconName: 'local_hospital' },
  { name: 'Educación', type: 'EXPENSE', colorHex: '#3B82F6', iconName: 'school' },
  { name: 'Servicios', type: 'EXPENSE', colorHex: '#8B5CF6', iconName: 'bolt' },
  { name: 'Internet / Teléfono', type: 'EXPENSE', colorHex: '#6366F1', iconName: 'wifi' },
  { name: 'Entretenimiento', type: 'EXPENSE', colorHex: '#F43F5E', iconName: 'movie' },
  { name: 'Ropa / Calzado', type: 'EXPENSE', colorHex: '#D946EF', iconName: 'checkroom' },
  { name: 'Suscripciones', type: 'EXPENSE', colorHex: '#A855F7', iconName: 'subscriptions' },
  { name: 'Seguros', type: 'EXPENSE', colorHex: '#0891B2', iconName: 'shield' },
  { name: 'Mascotas', type: 'EXPENSE', colorHex: '#F59E0B', iconName: 'pets' },
  { name: 'Impuestos', type: 'EXPENSE', colorHex: '#DC2626', iconName: 'gavel' },
  { name: 'Marketing', type: 'EXPENSE', colorHex: '#10B981', iconName: 'campaign' },
  { name: 'Software / Apps', type: 'EXPENSE', colorHex: '#2563EB', iconName: 'code' },
  { name: 'Oficina / Papelería', type: 'EXPENSE', colorHex: '#78716C', iconName: 'description' },
  { name: 'Equipos / Hardware', type: 'EXPENSE', colorHex: '#475569', iconName: 'devices' },
  { name: 'Nómina', type: 'EXPENSE', colorHex: '#B45309', iconName: 'group' },
  { name: 'Proveedores', type: 'EXPENSE', colorHex: '#EA580C', iconName: 'local_shipping' },
  { name: 'Capacitación', type: 'EXPENSE', colorHex: '#0D9488', iconName: 'menu_book' },
  { name: 'Legal', type: 'EXPENSE', colorHex: '#4F46E5', iconName: 'balance' },
  { name: 'Regalos', type: 'EXPENSE', colorHex: '#DB2777', iconName: 'redeem' },
  { name: 'Donaciones', type: 'EXPENSE', colorHex: '#EC4899', iconName: 'volunteer_activism' },
  { name: 'Ahorros', type: 'EXPENSE', colorHex: '#22C55E', iconName: 'savings' },
  { name: 'Otros Gastos', type: 'EXPENSE', colorHex: '#6B7280', iconName: 'remove_circle' },
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
    await this.categoryRepo.delete(id);
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