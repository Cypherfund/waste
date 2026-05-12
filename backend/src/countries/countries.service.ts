import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedCountry } from './entities/supported-country.entity';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(SupportedCountry)
    private readonly countryRepo: Repository<SupportedCountry>,
  ) {}

  async getActiveCountries(): Promise<SupportedCountry[]> {
    return this.countryRepo.find({
      where: { isActive: true },
      order: { countryName: 'ASC' },
    });
  }

  async listAll(): Promise<SupportedCountry[]> {
    return this.countryRepo.find({ order: { countryName: 'ASC' } });
  }

  async findByCode(countryCode: string): Promise<SupportedCountry | null> {
    return this.countryRepo.findOne({ where: { countryCode } });
  }

  async create(data: {
    countryCode: string;
    countryName: string;
    phonePrefix: string;
    flagEmoji?: string;
    currency: string;
    isActive?: boolean;
  }): Promise<SupportedCountry> {
    const country = this.countryRepo.create({
      countryCode: data.countryCode,
      countryName: data.countryName,
      phonePrefix: data.phonePrefix,
      flagEmoji: data.flagEmoji ?? null,
      currency: data.currency,
      isActive: data.isActive ?? true,
    });
    return this.countryRepo.save(country);
  }

  async setActive(countryCode: string, isActive: boolean): Promise<SupportedCountry> {
    const country = await this.countryRepo.findOne({ where: { countryCode } });
    if (!country) {
      throw new NotFoundException(`Country '${countryCode}' not found`);
    }
    country.isActive = isActive;
    return this.countryRepo.save(country);
  }
}
