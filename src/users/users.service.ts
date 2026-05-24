import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserConfig } from './entities/user-config.entity';
import { UpdateProfileDto, UpgradePlanDto, UpdateUserConfigDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserConfig) private configRepo: Repository<UserConfig>,
    private dataSource: DataSource,
  ) {}

  private async ensureUserConfigColumns() {
    await this.dataSource.query('ALTER TABLE omnia.user_configs ADD COLUMN IF NOT EXISTS "businessBudget" DECIMAL(12,2) DEFAULT 500.00');
    await this.dataSource.query('ALTER TABLE omnia.user_configs ADD COLUMN IF NOT EXISTS "savingsGoal" DECIMAL(12,2) DEFAULT 200.00');
    await this.dataSource.query("ALTER TABLE omnia.user_configs ADD COLUMN IF NOT EXISTS radar_theme VARCHAR(20) DEFAULT 'NEON'");
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { password_hash, ...result } = user;
    return result;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;
    await this.userRepo.save(user);
    return this.findById(id);
  }

  async upgradePlan(id: string, dto: UpgradePlanDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.is_pro = dto.isPro;
    await this.userRepo.save(user);
    return { isPro: user.is_pro }; 
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
    return { message: 'Contraseña actualizada' };
  }

  async getConfig(userId: string) {
    await this.ensureUserConfigColumns();
    let config = await this.configRepo.findOne({ where: { userId } });
    if (!config) {
      config = this.configRepo.create({
        userId,
        personalBudget: 1200,
        businessBudget: 500,
        savingsGoal: 200,
        currentEnergy: 8,
        countryCode: 'DO',
        baseCurrencyCode: 'DOP',
        radarTheme: 'NEON',
      });
      await this.configRepo.save(config);
    }
    return config;
  }

  async updateConfig(userId: string, data: UpdateUserConfigDto) {
    await this.ensureUserConfigColumns();
    let config = await this.configRepo.findOne({ where: { userId } });
    if (!config) {
      config = this.configRepo.create({ 
        userId, 
        personalBudget: data.personalBudget ?? 1200,
        businessBudget: data.businessBudget ?? 500,
        savingsGoal: data.savingsGoal ?? 200,
        currentEnergy: data.currentEnergy ?? 8,
        countryCode: data.countryCode ?? 'DO',
        baseCurrencyCode: data.baseCurrencyCode ?? 'DOP',
        radarTheme: data.radarTheme ?? 'NEON',
      });
    } else {
      if (data.personalBudget !== undefined) config.personalBudget = data.personalBudget;
      if (data.businessBudget !== undefined) config.businessBudget = data.businessBudget;
      if (data.savingsGoal !== undefined) config.savingsGoal = data.savingsGoal;
      if (data.currentEnergy !== undefined) config.currentEnergy = data.currentEnergy;
      if (data.countryCode !== undefined) config.countryCode = data.countryCode;
      if (data.baseCurrencyCode !== undefined) config.baseCurrencyCode = data.baseCurrencyCode;
      if (data.radarTheme !== undefined) config.radarTheme = data.radarTheme;
    }
    await this.configRepo.save(config);
    return config;
  }
}
