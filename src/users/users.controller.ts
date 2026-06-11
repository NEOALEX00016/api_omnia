import { Controller, Get, Put, Post, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpgradePlanDto, UpdateUserConfigDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario' })
  getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Actualizar perfil' })
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Put('upgrade-pro')
  @ApiOperation({ summary: 'Actualizar a plan Pro' })
  upgradePlan(@Request() req: any, @Body() dto: UpgradePlanDto) {
    return this.usersService.upgradePlan(req.user.id, dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración' })
  getConfig(@Request() req: any) {
    return this.usersService.getConfig(req.user.id);
  }

  @Put('config')
  @ApiOperation({ summary: 'Actualizar configuración' })
  updateConfig(@Request() req: any, @Body() data: UpdateUserConfigDto) {
    return this.usersService.updateConfig(req.user.id, data);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Eliminar todos los datos del usuario (factory reset)' })
  resetAllData(@Request() req: any) {
    return this.usersService.resetAllData(req.user.id);
  }
}
