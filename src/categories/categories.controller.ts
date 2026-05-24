import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear categoría' })
  create(@Request() req: any, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorías' })
  findAll(@Request() req: any, @Query('type') type?: string) {
    return this.categoriesService.findAll(req.user.id, type);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar categoría' })
  delete(@Request() req: any, @Param('id') id: string) {
    return this.categoriesService.delete(id, req.user.id);
  }
}