import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { SupportedCountry } from './entities/supported-country.entity';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @ApiOperation({ summary: 'Get all active (launched) countries' })
  @Public()
  @Get()
  getActiveCountries(): Promise<SupportedCountry[]> {
    return this.countriesService.getActiveCountries();
  }
}
