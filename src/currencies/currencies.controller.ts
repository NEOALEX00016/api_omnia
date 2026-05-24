import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Currencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las monedas' })
  @ApiResponse({ status: 200, description: 'Lista de monedas' })
  findAll() {
    return this.currenciesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener monedas activas' })
  @ApiResponse({ status: 200, description: 'Lista de monedas activas' })
  findActive() {
    return this.currenciesService.findActive();
  }

  @Get('exchange')
  @ApiOperation({ summary: 'Obtener tasa de cambio entre monedas' })
  @ApiQuery({ name: 'from', example: 'USD' })
  @ApiQuery({ name: 'to', example: 'DOP' })
  @ApiResponse({ status: 200, description: 'Tasa de cambio' })
  async getExchangeRate(@Query('from') from: string, @Query('to') to: string) {
    const rate = await this.currenciesService.getExchangeRate(from, to);
    return { from, to, rate };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener moneda por ID' })
  @ApiResponse({ status: 200, description: 'Moneda encontrada' })
  @ApiResponse({ status: 404, description: 'Moneda no encontrada' })
  findOne(@Param('id') id: string) {
    return this.currenciesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva moneda' })
  @ApiResponse({ status: 201, description: 'Moneda creada' })
  create(@Body() dto: CreateCurrencyDto) {
    return this.currenciesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar moneda' })
  @ApiResponse({ status: 200, description: 'Moneda actualizada' })
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.currenciesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar moneda' })
  @ApiResponse({ status: 200, description: 'Moneda eliminada' })
  remove(@Param('id') id: string) {
    return this.currenciesService.remove(id);
  }
}