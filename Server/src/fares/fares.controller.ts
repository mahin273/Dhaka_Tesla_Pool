import { Controller, Get, Query } from '@nestjs/common';
import { FaresService } from './fares.service';
import { EstimateFareDto } from './dto/estimate-fare.dto';
import { FareBreakdown } from './interfaces/fare-breakdown.interface';

@Controller('fares')
export class FaresController {
  constructor(private readonly faresService: FaresService) {}

  @Get('estimate')
  estimateFare(@Query() query: EstimateFareDto): FareBreakdown {
    return this.faresService.calculateFare(query.distanceKm, query.isPooled);
  }
}
