import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private currencyRepo: Repository<Currency>,
  ) {}

  async findAll(): Promise<Currency[]> {
    return this.currencyRepo.find({ order: { name: 'ASC' } });
  }

  async findActive(): Promise<Currency[]> {
    return this.currencyRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Currency> {
    const currency = await this.currencyRepo.findOne({ where: { id } });
    if (!currency) throw new NotFoundException(`Moneda no encontrada: ${id}`);
    return currency;
  }

  async findByCode(code: string): Promise<Currency> {
    const currency = await this.currencyRepo.findOne({ where: { code } });
    if (!currency) throw new NotFoundException(`Moneda no encontrada: ${code}`);
    return currency;
  }

  async create(dto: CreateCurrencyDto): Promise<Currency> {
    const currency = this.currencyRepo.create({
      ...dto,
      exchangeRateToUsd: dto.exchangeRateToUsd || 1,
    });
    return this.currencyRepo.save(currency);
  }

  async update(id: string, dto: UpdateCurrencyDto): Promise<Currency> {
    const currency = await this.findOne(id);
    Object.assign(currency, dto);
    return this.currencyRepo.save(currency);
  }

  async remove(id: string): Promise<void> {
    const currency = await this.findOne(id);
    await this.currencyRepo.remove(currency);
  }

  async getExchangeRate(fromCode: string, toCode: string): Promise<number> {
    if (fromCode === toCode) return 1;
    
    const from = await this.findByCode(fromCode);
    const to = await this.findByCode(toCode);
    
    return to.exchangeRateToUsd / from.exchangeRateToUsd;
  }
}