import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Countries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los países' })
  @ApiResponse({ status: 200, description: 'Lista de países' })
  findAll() {
    return this.countriesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener países activos' })
  @ApiResponse({ status: 200, description: 'Lista de países activos' })
  findActive() {
    return this.countriesService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener país por ID' })
  @ApiResponse({ status: 200, description: 'País encontrado' })
  @ApiResponse({ status: 404, description: 'País no encontrado' })
  findOne(@Param('id') id: string) {
    return this.countriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo país' })
  @ApiResponse({ status: 201, description: 'País creado' })
  create(@Body() dto: CreateCountryDto) {
    return this.countriesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar país' })
  @ApiResponse({ status: 200, description: 'País actualizado' })
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.countriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar país' })
  @ApiResponse({ status: 200, description: 'País eliminado' })
  remove(@Param('id') id: string) {
    return this.countriesService.remove(id);
  }
}