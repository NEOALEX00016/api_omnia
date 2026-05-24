import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private countryRepo: Repository<Country>,
  ) {}

  async findAll(): Promise<Country[]> {
    return this.countryRepo.find({ order: { name: 'ASC' } });
  }

  async findActive(): Promise<Country[]> {
    return this.countryRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Country> {
    const country = await this.countryRepo.findOne({ where: { id } });
    if (!country) throw new NotFoundException(`País no encontrado: ${id}`);
    return country;
  }

  async findByCode(code: string): Promise<Country> {
    const country = await this.countryRepo.findOne({ where: { code } });
    if (!country) throw new NotFoundException(`País no encontrado: ${code}`);
    return country;
  }

  async create(dto: CreateCountryDto): Promise<Country> {
    const country = this.countryRepo.create(dto);
    return this.countryRepo.save(country);
  }

  async update(id: string, dto: UpdateCountryDto): Promise<Country> {
    const country = await this.findOne(id);
    Object.assign(country, dto);
    return this.countryRepo.save(country);
  }

  async remove(id: string): Promise<void> {
    const country = await this.findOne(id);
    await this.countryRepo.remove(country);
  }
}